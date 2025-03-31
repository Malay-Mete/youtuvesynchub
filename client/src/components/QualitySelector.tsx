import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  type YouTubePlayer, 
  YoutubeQualityLevel, 
  qualityMap, 
  reverseQualityMap 
} from '@/lib/youtube';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  
  // Get quality readable name
  const qualityName = qualityMap[currentQuality] || 'Auto';
  
  // Get available qualities from player
  useEffect(() => {
    if (player) {
      try {
        const qualities = player.getAvailableQualityLevels();
        console.log('Available YouTube quality levels:', qualities);
        
        // Convert to readable formats
        const readableQualities = qualities.map(q => qualityMap[q as YoutubeQualityLevel] || q);
        console.log('Readable qualities:', readableQualities);
        
        // Always include common qualities for better UI consistency
        const allQualities = ['Auto', '1080p', '720p', '480p', '360p', '240p', '144p'];
        
        // Create a new array with no duplicates
        const uniqueQualities: string[] = [];
        [...readableQualities, ...allQualities].forEach(q => {
          if (!uniqueQualities.includes(q)) {
            uniqueQualities.push(q);
          }
        });
        
        setAvailableQualities(uniqueQualities);
      } catch (error) {
        console.error('Error getting available qualities:', error);
        setAvailableQualities(['Auto', '1080p', '720p', '480p', '360p', '240p', '144p']);
      }
    } else {
      // Default qualities when player is not available
      setAvailableQualities(['Auto', '1080p', '720p', '480p', '360p', '240p', '144p']);
    }
  }, [player]);
  
  const handleQualitySelect = (quality: string) => {
    console.log('Quality selected:', quality);
    // Make sure we're sending the correct YouTube quality level value
    if (reverseQualityMap[quality]) {
      console.log('Setting quality to:', reverseQualityMap[quality]);
      onQualityChange(reverseQualityMap[quality]);
    } else {
      // If it's not in our map, use as is (though this shouldn't happen)
      console.log('Using raw quality value:', quality);
      onQualityChange(quality);
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          size="sm"
          className="control-button flex items-center gap-1 h-9 px-3"
        >
          <i className="fas fa-cog text-xs mr-1 text-accent" aria-hidden="true"></i>
          <span className="text-sm font-medium">{qualityName}</span>
          <i className="fas fa-chevron-down text-xs ml-1 opacity-70" aria-hidden="true"></i>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-card/95 backdrop-blur border border-muted/30 rounded-lg shadow-lg p-1">
        {availableQualities.map((quality) => (
          <DropdownMenuItem
            key={quality}
            className={`quality-option rounded-md my-1 transition-all duration-200 ${
              qualityName === quality ? 'quality-option active' : ''
            }`}
            onClick={() => handleQualitySelect(quality)}
          >
            {qualityName === quality && (
              <i className="fas fa-check text-accent mr-2 text-xs"></i>
            )}
            {quality}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default QualitySelector;
