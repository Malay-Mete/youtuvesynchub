import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { checkRoomExists, subscribeToRoom, broadcastToRoom } from '@/lib/supabase';
import VideoPlayer from '@/components/VideoPlayer';
import ChatPanel from '@/components/ChatPanel';
import VideoControls from '@/components/VideoControls';
import type { YouTubePlayer, YoutubeQualityLevel } from '@/lib/youtube';
import { parseCommand, extractVideoId, qualityMap } from '@/lib/youtube';

type RoomParams = {
  roomCode: string;
};

type VideoState = {
  videoId: string | null;
  videoUrl: string | null;
  title: string | null;
  channelName: string | null;
  isPlaying: boolean;
  currentTime: number;
  quality: YoutubeQualityLevel;
  volume: number;
  playbackRate: number;
};

const initialVideoState: VideoState = {
  videoId: null,
  videoUrl: null,
  title: null,
  channelName: null,
  isPlaying: false,
  currentTime: 0,
  quality: 'default',
  volume: 100,
  playbackRate: 1,
};

const Room = () => {
  const { roomCode } = useParams<RoomParams>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [username, setUsername] = useState('');
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [videoState, setVideoState] = useState<VideoState>(initialVideoState);
  const [messages, setMessages] = useState<Array<{
    id: string;
    type: 'chat' | 'command' | 'system' | 'user_joined' | 'user_left' | 'video_changed' | 'video_state_changed';
    username: string;
    content: string;
    timestamp: number;
  }>>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize room and check if it exists
  useEffect(() => {
    const verifyRoom = async () => {
      try {
        const exists = await checkRoomExists(roomCode);
        if (!exists) {
          toast({
            title: "Room Not Found",
            description: "The room you are trying to join doesn't exist",
            variant: "destructive",
          });
          setLocation('/');
          return;
        }
        
        // Get username from localStorage or generate a new one
        const storedUsername = localStorage.getItem('yt-sync-username');
        if (storedUsername) {
          setUsername(storedUsername);
        }
        
        // Add system message
        setMessages([
          {
            id: `system-${Date.now()}`,
            type: 'system',
            username: 'System',
            content: `Welcome to room ${roomCode}`,
            timestamp: Date.now(),
          }
        ]);
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error verifying room:", error);
        toast({
          title: "Error",
          description: "Failed to verify room. Please try again.",
          variant: "destructive",
        });
        setLocation('/');
      }
    };
    
    verifyRoom();
  }, [roomCode, toast, setLocation]);

  // Subscribe to room updates
  useEffect(() => {
    if (isLoading || !username) return;
    
    // Broadcast that user joined the room
    broadcastToRoom(roomCode, {
      type: 'user_joined',
      roomCode,
      username,
    });
    
    // Subscribe to room messages
    const unsubscribe = subscribeToRoom(roomCode, (payload) => {
      switch(payload.type) {
        case 'chat':
        case 'command':
          if (payload.username && payload.message) {
            setMessages(prev => [...prev, {
              id: `${payload.type}-${payload.timestamp}`,
              type: payload.type,
              username: payload.username!,
              content: payload.message!,
              timestamp: payload.timestamp,
            }]);
          }
          break;
          
        case 'system':
          if (payload.message) {
            setMessages(prev => [...prev, {
              id: `system-${payload.timestamp}`,
              type: 'system',
              username: 'System',
              content: payload.message!,
              timestamp: payload.timestamp,
            }]);
          }
          break;
          
        case 'user_joined':
          if (payload.username) {
            setMembers(prev => [...prev.filter(name => name !== payload.username!), payload.username!]);
            setMessages(prev => [...prev, {
              id: `user-${payload.timestamp}`,
              type: 'system',
              username: 'System',
              content: `${payload.username} joined the room`,
              timestamp: payload.timestamp,
            }]);
          }
          break;
          
        case 'user_left':
          if (payload.username) {
            setMembers(prev => prev.filter(name => name !== payload.username));
            setMessages(prev => [...prev, {
              id: `user-${payload.timestamp}`,
              type: 'system',
              username: 'System',
              content: `${payload.username} left the room`,
              timestamp: payload.timestamp,
            }]);
          }
          break;
          
        case 'video_changed':
          if (payload.videoUrl && player) {
            const videoId = extractVideoId(payload.videoUrl);
            if (videoId) {
              player.loadVideoById(videoId);
              
              setMessages(prev => [...prev, {
                id: `video-${payload.timestamp}`,
                type: 'system',
                username: 'System',
                content: `${payload.username || 'Someone'} added a new video`,
                timestamp: payload.timestamp,
              }]);
              
              setVideoState(prev => ({
                ...prev,
                videoId,
                videoUrl: payload.videoUrl || null,
              }));
            }
          }
          break;
          
        case 'video_state_changed':
          if (payload.videoState && player) {
            const { action, value } = payload.videoState;
            
            switch(action) {
              case 'play':
                player.playVideo();
                break;
              case 'pause':
                player.pauseVideo();
                break;
              case 'seek':
                player.seekTo(value, true);
                break;
              case 'speed':
                player.setPlaybackRate(value);
                break;
              case 'volume':
                player.setVolume(value);
                break;
              case 'quality':
                player.setPlaybackQuality(value);
                break;
              case 'fullscreen':
                setIsFullscreen(prev => !prev);
                break;
            }
          }
          break;
      }
    });
    
    // Cleanup subscription and notify when user leaves
    return () => {
      broadcastToRoom(roomCode, {
        type: 'user_left',
        roomCode,
        username,
      });
      unsubscribe();
    };
  }, [roomCode, username, player, isLoading]);

  const handleSendMessage = (message: string) => {
    // Check if message is a command
    const parsedCommand = parseCommand(message);
    
    if (parsedCommand && player) {
      const { command, args } = parsedCommand;
      let systemMessage = '';
      
      // Execute command based on type
      switch(command) {
        case 'play':
          player.playVideo();
          systemMessage = 'Video playing';
          broadcastToRoom(roomCode, {
            type: 'video_state_changed',
            roomCode,
            username,
            videoState: {
              action: 'play',
            },
          });
          break;
          
        case 'pause':
          player.pauseVideo();
          systemMessage = 'Video paused';
          broadcastToRoom(roomCode, {
            type: 'video_state_changed',
            roomCode,
            username,
            videoState: {
              action: 'pause',
            },
          });
          break;
          
        case 'seek':
          if (args.length > 0) {
            const seconds = parseInt(args[0], 10);
            if (!isNaN(seconds)) {
              player.seekTo(seconds, true);
              systemMessage = `Video jumped to ${seconds} seconds`;
              broadcastToRoom(roomCode, {
                type: 'video_state_changed',
                roomCode,
                username,
                videoState: {
                  action: 'seek',
                  value: seconds,
                },
              });
            }
          }
          break;
          
        case 'speed':
          if (args.length > 0) {
            const speed = parseFloat(args[0]);
            if (!isNaN(speed) && speed >= 0.25 && speed <= 2) {
              player.setPlaybackRate(speed);
              systemMessage = `Playback speed set to ${speed}x`;
              broadcastToRoom(roomCode, {
                type: 'video_state_changed',
                roomCode,
                username,
                videoState: {
                  action: 'speed',
                  value: speed,
                },
              });
            }
          }
          break;
          
        case 'volume':
          if (args.length > 0) {
            const volume = parseInt(args[0], 10);
            if (!isNaN(volume) && volume >= 0 && volume <= 100) {
              player.setVolume(volume);
              systemMessage = `Volume set to ${volume}%`;
              broadcastToRoom(roomCode, {
                type: 'video_state_changed',
                roomCode,
                username,
                videoState: {
                  action: 'volume',
                  value: volume,
                },
              });
            }
          }
          break;
          
        case 'quality':
          if (args.length > 0) {
            const quality = args[0];
            player.setPlaybackQuality(quality as YoutubeQualityLevel);
            systemMessage = `Video quality changed to ${quality}`;
            broadcastToRoom(roomCode, {
              type: 'video_state_changed',
              roomCode,
              username,
              videoState: {
                action: 'quality',
                value: quality,
              },
            });
          }
          break;
          
        case 'fullscreen':
          setIsFullscreen(!isFullscreen);
          systemMessage = `Fullscreen ${isFullscreen ? 'exited' : 'entered'}`;
          broadcastToRoom(roomCode, {
            type: 'video_state_changed',
            roomCode,
            username,
            videoState: {
              action: 'fullscreen',
            },
          });
          break;
      }
      
      // Send the command to chat
      broadcastToRoom(roomCode, {
        type: 'command',
        roomCode,
        username,
        message,
      });
      
      // Send system message about command result
      if (systemMessage) {
        broadcastToRoom(roomCode, {
          type: 'system',
          roomCode,
          message: systemMessage,
        });
      }
      
    } else {
      // Check if message contains a YouTube URL
      const urlMatch = message.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      
      if (urlMatch && player) {
        const videoId = urlMatch[1];
        const videoUrl = message;
        
        // Load the video
        player.loadVideoById(videoId);
        
        // Broadcast video change
        broadcastToRoom(roomCode, {
          type: 'video_changed',
          roomCode,
          username,
          videoUrl,
        });
        
        // Add system message
        broadcastToRoom(roomCode, {
          type: 'system',
          roomCode,
          message: `${username} added a new video`,
        });
        
      } else {
        // Regular chat message
        broadcastToRoom(roomCode, {
          type: 'chat',
          roomCode,
          username,
          message,
        });
      }
    }
  };

  const handleLeaveRoom = () => {
    setLocation('/');
  };

  const handleLoadVideo = (url: string) => {
    if (!player) return;
    
    const videoId = extractVideoId(url);
    if (videoId) {
      player.loadVideoById(videoId);
      
      // Broadcast video change
      broadcastToRoom(roomCode, {
        type: 'video_changed',
        roomCode,
        username,
        videoUrl: url,
      });
      
      setVideoState(prev => ({
        ...prev,
        videoId,
        videoUrl: url || null,
      }));
    } else {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
    }
  };

  const handleQualityChange = (quality: string) => {
    if (!player) return;
    
    console.log('Room: Setting video quality to:', quality);
    
    try {
      // Try to set the quality
      player.setPlaybackQuality(quality as YoutubeQualityLevel);
      
      // Get the actual quality label to display
      const readableQuality = qualityMap[quality as YoutubeQualityLevel] || quality;
      
      // Update the local state
      setVideoState(prev => ({
        ...prev,
        quality: quality as YoutubeQualityLevel,
      }));
      
      // Broadcast quality change to others
      broadcastToRoom(roomCode, {
        type: 'video_state_changed',
        roomCode,
        username,
        videoState: {
          action: 'quality',
          value: quality,
        },
      });
      
      // Add system message
      broadcastToRoom(roomCode, {
        type: 'system',
        roomCode,
        message: `Video quality changed to ${readableQuality}`,
      });
      
      // Show toast confirmation
      toast({
        title: "Quality Changed",
        description: `Video quality set to ${readableQuality}`,
      });
      
      console.log('Quality successfully changed to:', quality);
    } catch (error) {
      console.error('Error changing video quality:', error);
      toast({
        title: "Quality Change Failed",
        description: "Couldn't change video quality. Try again later.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Joining room {roomCode}...</h2>
        </div>
      </div>
    );
  }

  return (
    <div id="app" className="flex flex-col h-screen">
      {/* Header */}
      <header className="app-header py-3 px-4 border-b border-muted/30">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <i className="fas fa-play-circle text-primary text-2xl"></i>
            <h1 className="text-xl app-title">YouTube Sync</h1>
          </div>
          
          <div className="flex items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground text-sm">Room:</span>
                <span 
                  className="room-code text-sm cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(roomCode);
                    toast({
                      title: "Room Code Copied",
                      description: "Share this code with your friends to join",
                    });
                  }}
                >{roomCode}</span>
              </div>
              <button 
                onClick={handleLeaveRoom}
                className="text-sm text-muted-foreground hover:text-primary transition-all btn-hover-effect px-3 py-1 rounded-md hover:bg-muted/30"
              >
                <i className="fas fa-sign-out-alt mr-1"></i> Leave
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
        {/* Left Side - Video Display and Controls */}
        <div className="flex flex-col w-full md:w-3/4 h-full p-4">
          {/* Video Container */}
          <VideoPlayer 
            onPlayerReady={setPlayer} 
            isFullscreen={isFullscreen} 
            setIsFullscreen={setIsFullscreen}
          />
          
          {/* Video Controls */}
          <VideoControls 
            player={player}
            videoState={videoState}
            setVideoState={setVideoState}
            onLoadVideo={handleLoadVideo}
            onQualityChange={handleQualityChange}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
            roomCode={roomCode}
            username={username}
          />
          
          {/* Current Video Info */}
          {videoState.title && (
            <div className="p-4 mt-2 glass-panel rounded-lg hidden md:block animate-[fadeIn_0.3s_ease-out]">
              <h2 className="font-semibold truncate text-lg">{videoState.title}</h2>
              {videoState.channelName && (
                <p className="text-sm text-muted-foreground mt-1">{videoState.channelName}</p>
              )}
            </div>
          )}
        </div>
        
        {/* Right Side - Chat and Controls */}
        <ChatPanel 
          messages={messages} 
          onSendMessage={handleSendMessage} 
          members={members} 
          username={username}
        />
      </div>
    </div>
  );
};

export default Room;
