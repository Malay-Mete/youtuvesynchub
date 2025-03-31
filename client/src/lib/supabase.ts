import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

// This is a helper function to get the initialized Supabase client from the window
export function getSupabaseClient() {
  if (!window.supabase) {
    const { toast } = useToast();
    toast({
      title: 'Error',
      description: 'Supabase client is not initialized',
      variant: 'destructive',
    });
    throw new Error('Supabase client is not initialized');
  }
  return window.supabase;
}

// Type for the real-time message payload
export type RealtimeMessage = {
  type: 'chat' | 'command' | 'system' | 'user_joined' | 'user_left' | 'video_changed' | 'video_state_changed';
  roomCode: string;
  message?: string;
  username?: string;
  userId?: string;
  videoUrl?: string;
  videoState?: any;
  timestamp: number;
};

// Helper function to subscribe to a Supabase channel
export function subscribeToRoom(roomCode: string, callback: (payload: RealtimeMessage) => void) {
  const supabase = getSupabaseClient();
  
  const channel = supabase.channel(`room:${roomCode}`)
    .on('broadcast', { event: 'message' }, (payload: { payload: RealtimeMessage }) => {
      callback(payload.payload);
    })
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}

// Helper function to broadcast a message to a room
export async function broadcastToRoom(roomCode: string, message: Omit<RealtimeMessage, 'timestamp'>) {
  const supabase = getSupabaseClient();
  
  return await supabase.channel(`room:${roomCode}`)
    .send({
      type: 'broadcast',
      event: 'message',
      payload: {
        ...message,
        timestamp: Date.now(),
      },
    });
}

// Generate a random username
export function generateUsername() {
  const adjectives = ['Happy', 'Sleepy', 'Hungry', 'Calm', 'Eager', 'Fancy', 'Brave', 'Bright'];
  const nouns = ['Fox', 'Panda', 'Tiger', 'Wolf', 'Eagle', 'Koala', 'Owl', 'Dolphin'];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 100);
  
  return `${adjective}${noun}${number}`;
}

// Generate a random room code
export function generateRoomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Create a new room
export async function createRoom() {
  const supabase = getSupabaseClient();
  const roomCode = generateRoomCode();
  
  // Store the room in Supabase
  const { error } = await supabase
    .from('rooms')
    .insert([
      { code: roomCode, created_at: new Date() },
    ]);
  
  if (error) {
    console.error('Error creating room:', error);
    throw error;
  }
  
  return roomCode;
}

// Check if room exists
export async function checkRoomExists(roomCode: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('rooms')
    .select('code')
    .eq('code', roomCode)
    .single();
  
  if (error) {
    console.error('Error checking room:', error);
    return false;
  }
  
  return !!data;
}
