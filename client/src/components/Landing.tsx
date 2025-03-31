import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { createRoom, checkRoomExists, generateUsername } from '@/lib/supabase';

const Landing: React.FC = () => {
  const [, setLocation] = useLocation();
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  // Generate a random username when component mounts
  React.useEffect(() => {
    const username = localStorage.getItem('yt-sync-username') || generateUsername();
    localStorage.setItem('yt-sync-username', username);
  }, []);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const newRoomCode = await createRoom();
      toast({
        title: "Room Created",
        description: `Your room code is: ${newRoomCode}`,
      });
      setLocation(`/room/${newRoomCode}`);
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomCode.trim()) {
      toast({
        title: "Invalid Room Code",
        description: "Please enter a valid room code",
        variant: "destructive",
      });
      return;
    }
    
    setIsJoining(true);
    try {
      const exists = await checkRoomExists(roomCode);
      
      if (exists) {
        setLocation(`/room/${roomCode.toUpperCase()}`);
      } else {
        toast({
          title: "Room Not Found",
          description: "The room code you entered doesn't exist",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error joining room:", error);
      toast({
        title: "Error",
        description: "Failed to join room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-4 bg-background min-h-screen">
      <Card className="max-w-md w-full bg-card rounded-lg shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <i className="fas fa-play-circle text-primary text-5xl"></i>
          </div>
          <h2 className="text-2xl font-semibold mb-6">Watch YouTube videos together, in perfect sync</h2>
          
          <div className="space-y-6">
            <div>
              <Button 
                variant="default" 
                className="w-full bg-primary hover:bg-red-700 text-white font-medium py-3 px-4 rounded-md transition"
                onClick={handleCreateRoom}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                    Creating...
                  </>
                ) : (
                  'Create a New Room'
                )}
              </Button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">or</span>
              </div>
            </div>
            
            <form className="space-y-4" onSubmit={handleJoinRoom}>
              <div>
                <Input 
                  type="text" 
                  placeholder="Enter Room Code" 
                  className="w-full bg-muted border border-muted focus:border-accent focus:ring-1 focus:ring-accent rounded-md py-3 px-4 text-foreground placeholder-muted-foreground"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-accent hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-md transition"
                disabled={isJoining}
              >
                {isJoining ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                    Joining...
                  </>
                ) : (
                  'Join Room'
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Landing;
