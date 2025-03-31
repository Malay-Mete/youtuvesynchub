import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { checkRoomExists, subscribeToRoom, broadcastToRoom } from '@/lib/supabase';

interface UseRoomOptions {
  roomCode: string;
  username: string;
}

export function useRoom({ roomCode, username }: UseRoomOptions) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [messages, setMessages] = useState<Array<{
    id: string;
    type: 'chat' | 'command' | 'system';
    username: string;
    content: string;
    timestamp: number;
  }>>([]);
  const { toast } = useToast();

  // Initialize room and verify it exists
  useEffect(() => {
    const verifyRoom = async () => {
      try {
        const exists = await checkRoomExists(roomCode);
        if (!exists) {
          setError(`Room ${roomCode} does not exist`);
          toast({
            title: "Room Not Found",
            description: `The room ${roomCode} doesn't exist or has been closed`,
            variant: "destructive",
          });
          return;
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
      } catch (err) {
        console.error("Error verifying room:", err);
        setError("Failed to connect to the room");
        toast({
          title: "Connection Error",
          description: "Failed to connect to the room. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    verifyRoom();
  }, [roomCode, toast]);

  // Subscribe to room updates
  useEffect(() => {
    if (isLoading || error || !username) return;
    
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
      }
    });
    
    // Cleanup
    return () => {
      broadcastToRoom(roomCode, {
        type: 'user_left',
        roomCode,
        username,
      });
      unsubscribe();
    };
  }, [roomCode, username, isLoading, error]);

  return {
    isLoading,
    error,
    members,
    messages,
    setMessages,
  };
}
