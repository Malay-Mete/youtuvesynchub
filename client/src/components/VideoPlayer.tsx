import React, { useEffect, useRef, useState } from 'react';
import { loadYouTubeAPI, type YouTubePlayer, YT_PLAYER_STATE } from '@/lib/youtube';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize, ExternalLink } from 'lucide-react';

interface VideoPlayerProps {
  onPlayerReady: (player: YouTubePlayer) => void;
  isFullscreen: boolean;
  setIsFullscreen: (isFullscreen: boolean) => void;
  isFitToScreen?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  onPlayerReady, 
  isFullscreen, 
  setIsFullscreen,
  isFitToScreen = false
}) => {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPipMode, setIsPipMode] = useState(false);
  const { toast } = useToast();

  // Check if Picture-in-Picture is supported
  const isPipSupported = () => {
    return document.pictureInPictureEnabled && 
           !!(document.createElement('video').requestPictureInPicture);
  };

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = document.fullscreenElement !== null;
      if (isFullscreen !== isCurrentlyFullscreen) {
        setIsFullscreen(isCurrentlyFullscreen);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, setIsFullscreen]);

  // Handle Picture-in-Picture change
  useEffect(() => {
    const handlePipChange = () => {
      setIsPipMode(document.pictureInPictureElement !== null);
    };

    document.addEventListener('enterpictureinpicture', handlePipChange);
    document.addEventListener('leavepictureinpicture', handlePipChange);
    return () => {
      document.removeEventListener('enterpictureinpicture', handlePipChange);
      document.removeEventListener('leavepictureinpicture', handlePipChange);
    };
  }, []);

  // Toggle fullscreen
  useEffect(() => {
    if (!playerContainerRef.current) return;

    const container = playerContainerRef.current;

    if (isFullscreen && !document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        toast({
          title: "Fullscreen Error",
          description: `Error attempting to enable fullscreen: ${err.message}`,
          variant: "destructive",
        });
      });
    } else if (!isFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, [isFullscreen, toast]);

  // Function to toggle PiP mode
  const togglePictureInPicture = async () => {
    try {
      // Get the YouTube iframe from the DOM
      if (!playerContainerRef.current) return;
      
      const iframe = playerContainerRef.current.querySelector('iframe');
      if (!iframe) {
        throw new Error('YouTube iframe not found');
      }
      
      iframeRef.current = iframe;
      
      // If we already have a video element for PiP
      if (videoRef.current && videoRef.current.srcObject) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
        return;
      }
      
      // Create a hidden video element if we don't have one yet
      if (!videoRef.current) {
        const video = document.createElement('video');
        video.className = 'hidden';
        video.autoplay = true;
        video.muted = true; // Must be muted to auto-play
        video.width = 640;
        video.height = 360;
        videoRef.current = video;
        document.body.appendChild(video);
      }
      
      // Capture the YouTube iframe content
      // Note: This requires that the iframe has allow="picture-in-picture" attribute
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          // These are non-standard but supported in many browsers
          // @ts-ignore - cursor is supported in Chrome but not in the TypeScript types
          cursor: "never",
          // @ts-ignore - displaySurface is supported in Chrome but not in the TypeScript types
          displaySurface: "browser",
        },
        audio: true,
      });
      
      // Set the stream to our video element
      videoRef.current.srcObject = stream;
      
      // Listen for the end of PiP mode
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (videoRef.current && videoRef.current.srcObject) {
          const oldStream = videoRef.current.srcObject as MediaStream;
          oldStream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
        setIsPipMode(false);
      });
      
      // Enter PiP mode
      await videoRef.current.requestPictureInPicture();
      setIsPipMode(true);
      
      toast({
        title: "Picture-in-Picture",
        description: "Video is now playing in picture-in-picture mode",
      });
    } catch (error) {
      console.error('Failed to enter Picture-in-Picture mode:', error);
      toast({
        title: "Picture-in-Picture Error",
        description: "Failed to enter picture-in-picture mode. This feature may not be supported in your browser or requires permission.",
        variant: "destructive",
      });
    }
  };

  // Initialize YouTube API and player
  useEffect(() => {
    const initPlayer = async () => {
      try {
        await loadYouTubeAPI();
        
        if (!playerContainerRef.current) return;
        
        // Create a div for the player
        const playerDiv = document.createElement('div');
        playerDiv.id = 'youtube-player';
        playerContainerRef.current.appendChild(playerDiv);
        
        // Initialize player
        const player = new window.YT.Player('youtube-player', {
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              onPlayerReady(event.target);
              setIsLoading(false);
              
              // Store the iframe reference
              const iframe = playerContainerRef.current?.querySelector('iframe');
              if (iframe) {
                // Add Picture-in-Picture attribute to the iframe
                iframe.setAttribute('allow', 'autoplay; picture-in-picture');
                iframeRef.current = iframe;
              }
            },
            onError: (event) => {
              console.error('YouTube player error:', event.data);
              toast({
                title: "Video Error",
                description: "There was an error loading the video",
                variant: "destructive",
              });
            },
            onStateChange: (event) => {
              // Handle state changes if needed
              if (event.data === YT_PLAYER_STATE.ENDED) {
                // Video ended
              }
            },
          },
        });
        
        return () => {
          player.destroy();
          
          // Clean up video element when component unmounts
          if (videoRef.current) {
            if (videoRef.current.srcObject) {
              const stream = videoRef.current.srcObject as MediaStream;
              stream.getTracks().forEach(track => track.stop());
            }
            if (document.pictureInPictureElement === videoRef.current) {
              document.exitPictureInPicture().catch(console.error);
            }
            videoRef.current.remove();
          }
        };
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
        toast({
          title: "Player Error",
          description: "Failed to initialize YouTube player",
          variant: "destructive",
        });
      }
    };
    
    initPlayer();
  }, [onPlayerReady, toast]);

  // Clean up PiP mode when component unmounts
  useEffect(() => {
    return () => {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(console.error);
      }
    };
  }, []);

  return (
    <div 
      className={`relative bg-black w-full ${
        isFullscreen 
          ? 'youtube-container-fullscreen' 
          : isFitToScreen 
            ? 'youtube-container-fit' 
            : 'youtube-container'
      } glass-panel rounded-lg overflow-hidden`}
      ref={playerContainerRef}
    >
      {/* Video controls overlay */}
      {!isLoading && (
        <div className="absolute top-2 right-2 z-10 flex space-x-2 opacity-50 hover:opacity-100 transition-opacity">
          <Button 
            variant="secondary" 
            size="icon" 
            className="rounded-full bg-black/60 hover:bg-black/80 text-white h-8 w-8"
            onClick={togglePictureInPicture}
            title="Picture-in-Picture"
          >
            <ExternalLink size={14} />
          </Button>
          
          <Button 
            variant="secondary" 
            size="icon" 
            className="rounded-full bg-black/60 hover:bg-black/80 text-white h-8 w-8"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </Button>
        </div>
      )}
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-background/80 to-background/95 backdrop-blur-sm rounded-lg">
          <div className="text-center space-y-4 animate-[fadeIn_0.5s_ease-out] p-8 max-w-md">
            <div className="flex justify-center">
              <div className="relative">
                <i className="fas fa-play-circle text-primary text-6xl mb-2 animate-pulse"></i>
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl -z-10"></div>
              </div>
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">YouTube Sync</h3>
            <p className="text-muted-foreground">No video playing yet</p>
            <div className="mt-4 glass-panel rounded-lg p-4 text-sm">
              <p className="font-medium text-foreground/80">To start watching:</p>
              <ul className="mt-3 space-y-3">
                <li className="flex items-center text-muted-foreground">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 mr-3 text-primary text-xs">1</span>
                  Paste a YouTube URL in the chat
                </li>
                <li className="flex items-center text-muted-foreground">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 mr-3 text-primary text-xs">2</span>
                  Use the URL input below
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden video element for Picture-in-Picture */}
      {/* Will be added to the DOM dynamically */}
    </div>
  );
};

export default VideoPlayer;
