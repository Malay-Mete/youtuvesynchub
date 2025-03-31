import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import QualitySelector from './QualitySelector';
import { broadcastToRoom } from '@/lib/supabase';
import { type YouTubePlayer, YoutubeQualityLevel } from '@/lib/youtube';

interface VideoControlsProps {
  player: YouTubePlayer | null;
  videoState: {
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
  setVideoState: React.Dispatch<React.SetStateAction<any>>;
  onLoadVideo: (url: string) => void;
  onQualityChange: (quality: string) => void;
  isFullscreen: boolean;
  setIsFullscreen: (isFullscreen: boolean) => void;
  roomCode: string;
  username: string;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  player,
  videoState,
  setVideoState,
  onLoadVideo,
  onQualityChange,
  isFullscreen,
  setIsFullscreen,
  roomCode,
  username,
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [volume, setVolume] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Define the VideoState type
  type VideoStateType = {
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

  // Update volume when the slider changes
  const handleVolumeChange = (value: number[]) => {
    if (!player) return;
    
    const newVolume = value[0];
    setVolume(newVolume);
    player.setVolume(newVolume);
    
    // Broadcast volume change
    broadcastToRoom(roomCode, {
      type: 'video_state_changed',
      roomCode,
      username,
      videoState: {
        action: 'volume',
        value: newVolume,
      },
    });
  };

  // Toggle play/pause
  const handleTogglePlay = () => {
    if (!player) return;
    
    if (isPlaying) {
      player.pauseVideo();
      
      // Broadcast pause
      broadcastToRoom(roomCode, {
        type: 'video_state_changed',
        roomCode,
        username,
        videoState: {
          action: 'pause',
        },
      });
    } else {
      player.playVideo();
      
      // Broadcast play
      broadcastToRoom(roomCode, {
        type: 'video_state_changed',
        roomCode,
        username,
        videoState: {
          action: 'play',
        },
      });
    }
    
    setIsPlaying(!isPlaying);
  };

  // Toggle fullscreen
  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    
    // Broadcast fullscreen change
    broadcastToRoom(roomCode, {
      type: 'video_state_changed',
      roomCode,
      username,
      videoState: {
        action: 'fullscreen',
      },
    });
  };

  // Load video from URL input
  const handleLoadVideo = () => {
    if (videoUrl.trim()) {
      onLoadVideo(videoUrl);
      setVideoUrl('');
    }
  };

  // Handle key press in URL input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLoadVideo();
    }
  };

  // Sync player state periodically
  useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      try {
        setIsPlaying(player.getPlayerState() === 1);
        setVolume(player.getVolume());
        
        if (player.getVideoData) {
          const videoData = player.getVideoData();
          
          if (videoData?.title !== videoState.title) {
            setVideoState((prev: VideoStateType) => ({
              ...prev,
              title: videoData?.title || null,
              channelName: videoData?.author || null,
            }));
          }
        }
      } catch (error) {
        console.error('Error syncing player state:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player, videoState.title, setVideoState]);

  return (
    <div className="p-4 mt-3 glass-panel rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="icon"
            className="control-button"
            onClick={handleTogglePlay}
            disabled={!player}
          >
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
          </Button>
          
          <div className="flex items-center space-x-3 bg-muted/20 rounded-full px-2 py-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-foreground btn-hover-effect p-1 rounded-full"
              onClick={() => handleVolumeChange([Math.max(0, volume - 10)])}
              disabled={!player}
            >
              <i className="fas fa-volume-down"></i>
            </Button>
            
            <Slider
              value={[volume]}
              min={0}
              max={100}
              step={1}
              className="w-24"
              onValueChange={handleVolumeChange}
              disabled={!player}
            />
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-foreground btn-hover-effect p-1 rounded-full"
              onClick={() => handleVolumeChange([Math.min(100, volume + 10)])}
              disabled={!player}
            >
              <i className="fas fa-volume-up"></i>
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative flex-grow max-w-md">
            <Input 
              type="text" 
              placeholder="Paste YouTube URL here" 
              className="message-input pl-10 pr-10"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              <i className="fab fa-youtube"></i>
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary hover:text-accent btn-hover-effect"
              onClick={handleLoadVideo}
              disabled={!player || videoUrl.trim() === ''}
            >
              <i className="fas fa-arrow-right"></i>
            </Button>
          </div>

          <QualitySelector 
            player={player} 
            onQualityChange={onQualityChange} 
            currentQuality={videoState.quality}
            disabled={!player}
          />
          
          <Button 
            variant="outline" 
            size="icon"
            className="control-button"
            onClick={handleToggleFullscreen}
            disabled={!player}
          >
            <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoControls;
