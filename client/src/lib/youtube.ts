// Youtube iframe API types
export interface YouTubePlayer {
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  cueVideoById: (videoId: string, startSeconds?: number) => void;
  loadVideoByUrl: (mediaContentUrl: string, startSeconds?: number) => void;
  cueVideoByUrl: (mediaContentUrl: string, startSeconds?: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getVideoLoadedFraction: () => number;
  setPlaybackRate: (suggestedRate: number) => void;
  getPlaybackRate: () => number;
  getAvailablePlaybackRates: () => number[];
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getVideoUrl: () => string;
  getVideoEmbedCode: () => string;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoData: () => { video_id: string; author: string; title: string };
  setSize: (width: number, height: number) => void;
  getIframe: () => HTMLIFrameElement;
  destroy: () => void;
  setOption: (module: string, option: string, value: any) => void;
  getPlaybackQuality: () => string;
  setPlaybackQuality: (suggestedQuality: string) => void;
  getAvailableQualityLevels: () => string[];
}

// YouTube Player States
export enum YT_PLAYER_STATE {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5
}

// YouTube Quality Levels
export type YoutubeQualityLevel = 'small' | 'medium' | 'large' | 'hd720' | 'hd1080' | 'highres' | 'default';

// Map YouTube quality levels to readable format
export const qualityMap: Record<YoutubeQualityLevel, string> = {
  small: '240p',
  medium: '360p',
  large: '480p',
  hd720: '720p',
  hd1080: '1080p',
  highres: '1440p+',
  default: 'Auto'
};

// Map readable format back to YouTube quality levels
export const reverseQualityMap: Record<string, YoutubeQualityLevel> = {
  '144p': 'small',
  '240p': 'small',
  '360p': 'medium',
  '480p': 'large',
  '720p': 'hd720',
  '1080p': 'hd1080',
  '1440p': 'highres',
  '2160p': 'highres',
  'Auto': 'default'
};

// Load the YouTube API
export function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };
  });
}

// Extract video ID from YouTube URL
export function extractVideoId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

// Parse commands from chat message
export function parseCommand(message: string): { command: string, args: string[] } | null {
  const trimmedMessage = message.trim();
  
  // Check if the message is a command (starts with a valid command word)
  const commandRegex = /^(play|pause|seek|speed|volume|quality|fullscreen)\b/i;
  const isCommand = commandRegex.test(trimmedMessage);
  
  if (!isCommand) {
    return null;
  }
  
  const parts = trimmedMessage.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  
  return { command, args };
}

// Add type definitions to window
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId?: string;
          playerVars?: {
            autoplay?: 0 | 1;
            controls?: 0 | 1;
            disablekb?: 0 | 1;
            enablejsapi?: 0 | 1;
            fs?: 0 | 1;
            modestbranding?: 0 | 1;
            playsinline?: 0 | 1;
            rel?: 0 | 1;
            showinfo?: 0 | 1;
            origin?: string;
          };
          events?: {
            onReady?: (event: { target: YouTubePlayer }) => void;
            onStateChange?: (event: { data: number, target: YouTubePlayer }) => void;
            onError?: (event: { data: number }) => void;
            onPlaybackQualityChange?: (event: { quality: string, target: YouTubePlayer }) => void;
          };
        }
      ) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}
