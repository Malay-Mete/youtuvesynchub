import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { type YouTubePlayer, YoutubeQualityLevel, qualityMap, reverseQualityMap } from '@/lib/youtube';

interface QualitySelectorProps {
  player: YouTubePlayer | null;
  onQualityChange: (quality: string) => void;
  currentQuality: YoutubeQualityLevel;
  disabled: boolean;
}

const QualitySelector: React.FC<QualitySelectorProps> = ({
  player,
  onQualityChange,
  currentQuality,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Get quality readable name
  const qualityName = qualityMap[currentQuality] || 'Auto';
  
  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Get available qualities from player
  useEffect(() => {
    if (player) {
      try {
        const qualities = player.getAvailableQualityLevels();
        const readableQualities = qualities.map(q => qualityMap[q as YoutubeQualityLevel] || q);
        
        // Always include common qualities even if not reported by YouTube
        const allQualities = ['Auto', '1080p', '720p', '480p', '360p', '240p', '144p'];
        
        // Merge and deduplicate
        const mergedQualities = [...new Set([...readableQualities, ...allQualities])];
        
        setAvailableQualities(mergedQualities);
      } catch (error) {
        console.error('Error getting available qualities:', error);
        setAvailableQualities(['Auto', '1080p', '720p', '480p', '360p', '240p', '144p']);
      }
    }
  }, [player, currentQuality]);
  
  const handleQualitySelect = (quality: string) => {
    if (reverseQualityMap[quality]) {
      onQualityChange(reverseQualityMap[quality]);
    } else {
      onQualityChange(quality);
    }
    setIsOpen(false);
  };
  
  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        className="flex items-center space-x-1 bg-muted hover:bg-muted-foreground/10 text-sm text-muted-foreground px-3 py-2 rounded-md"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <i className="fas fa-cog"></i>
        <span>{qualityName}</span>
        <i className="fas fa-chevron-down text-xs"></i>
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-1 w-36 bg-muted rounded-md shadow-lg z-10">
          <div className="py-1">
            {availableQualities.map((quality) => (
              <button
                key={quality}
                onClick={() => handleQualitySelect(quality)}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  qualityName === quality 
                    ? 'text-accent bg-secondary' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-accent'
                } transition`}
              >
                {quality}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QualitySelector;
