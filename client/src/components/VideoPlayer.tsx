import React, { useEffect, useRef, useState } from 'react';
import { loadYouTubeAPI, type YouTubePlayer, YT_PLAYER_STATE } from '@/lib/youtube';
import { useToast } from '@/hooks/use-toast';

interface VideoPlayerProps {
  onPlayerReady: (player: YouTubePlayer) => void;
  isFullscreen: boolean;
  setIsFullscreen: (isFullscreen: boolean) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  onPlayerReady, 
  isFullscreen, 
  setIsFullscreen 
}) => {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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

  return (
    <div 
      className={`relative bg-black w-full ${isFullscreen ? 'youtube-container' : 'youtube-container'}`}
      ref={playerContainerRef}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-secondary to-card rounded-lg">
          <div className="text-center space-y-4 animate-[fadeIn_0.5s_ease-out] p-8">
            <div className="flex justify-center">
              <i className="fas fa-play-circle text-primary text-6xl mb-2"></i>
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">YouTube Sync</h3>
            <p className="text-muted-foreground">No video playing yet</p>
            <div className="mt-4 bg-muted/40 rounded-lg p-3 text-sm text-muted-foreground">
              <p>Either:</p>
              <ul className="mt-2 space-y-2">
                <li className="flex items-center"><i className="fas fa-caret-right text-accent mr-2"></i> Paste a YouTube URL in the chat</li>
                <li className="flex items-center"><i className="fas fa-caret-right text-accent mr-2"></i> Use the URL input below</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
