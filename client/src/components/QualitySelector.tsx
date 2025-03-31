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
          className="flex items-center gap-1 bg-muted/30 hover:bg-muted/50 text-sm font-medium h-9 px-3"
        >
          <i className="fas fa-cog text-xs mr-1" aria-hidden="true"></i>
          <span>{qualityName}</span>
          <i className="fas fa-chevron-down text-xs ml-1" aria-hidden="true"></i>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {availableQualities.map((quality) => (
          <DropdownMenuItem
            key={quality}
            className={`${qualityName === quality ? 'bg-secondary/50 font-medium' : ''}`}
            onClick={() => handleQualitySelect(quality)}
          >
            {quality}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default QualitySelector;
