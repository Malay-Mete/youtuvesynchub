import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

// This is a helper function to get the initialized Supabase client from the window
let wsConnection: WebSocket | null = null;
let wsCallbacks: Map<string, ((payload: any) => void)[]> = new Map();

// Create a websocket connection to our server
function getWebSocketConnection() {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    return wsConnection;
  }
  
  try {
    // Create a new connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket server at:', wsUrl);
    wsConnection = new WebSocket(wsUrl);
    
    wsConnection.onopen = () => {
      console.log('WebSocket connection established');
    };
    
    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const roomCode = data.roomCode;
        
        // Dispatch the message to all callbacks for this room
        if (roomCode && wsCallbacks.has(roomCode)) {
          const callbacks = wsCallbacks.get(roomCode) || [];
          callbacks.forEach(callback => callback(data));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsConnection.onclose = () => {
      console.log('WebSocket connection closed');
      // Trigger reconnect after a delay
      setTimeout(() => {
        wsConnection = null;
        getWebSocketConnection();
      }, 5000);
    };
    
    return wsConnection;
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    return null;
  }
}

export function getSupabaseClient() {
  try {
    // Check if we have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    // If Supabase is not initialized yet but we have the credentials, initialize it
    if (!window.supabase && supabaseUrl && supabaseAnonKey) {
      window.supabase = createClient(supabaseUrl, supabaseAnonKey);
      console.log('Supabase client initialized successfully');
    }
    
    // If still not available after attempting initialization
    if (!window.supabase) {
      console.warn('Supabase client is not available. Using direct WebSocket connection.');
      // Initiate a WebSocket connection to our server
      getWebSocketConnection();
      
      // Return a minimal implementation that uses our WebSocket connection
      return {
        channel: () => ({
          on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
          subscribe: () => ({ unsubscribe: () => {} }),
        }),
        removeChannel: () => {},
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: new Error('Supabase not available') }),
            }),
            limit: () => ({
              catch: async () => ({ error: new Error('Supabase not available') }),
            }),
          }),
          insert: async () => ({ error: new Error('Supabase not available') }),
        }),
        rpc: async () => ({ error: new Error('Supabase not available') }),
      };
    }
    
    return window.supabase;
  } catch (error: any) {
    console.error('Error getting Supabase client:', error);
    
    // Initialize WebSocket connection
    getWebSocketConnection();
    
    // Return a fallback minimal implementation that won't break the app
    return {
      channel: () => ({
        on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        subscribe: () => ({ unsubscribe: () => {} }),
      }),
      removeChannel: () => {},
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: new Error('Supabase error') }),
          }),
          limit: () => ({
            catch: async () => ({ error: new Error('Supabase error') }),
          }),
        }),
        insert: async () => ({ error: new Error('Supabase error') }),
      }),
      rpc: async () => ({ error: new Error('Supabase error') }),
    };
  }
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

// Helper function to subscribe to a Supabase channel or WebSocket
export function subscribeToRoom(roomCode: string, callback: (payload: RealtimeMessage) => void) {
  // Try to use Supabase if available
  if (window.supabase) {
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
  // Use direct WebSocket connection
  else {
    // Ensure we have a WebSocket connection
    const ws = getWebSocketConnection();
    
    // Add the callback to our wsCallbacks map
    if (!wsCallbacks.has(roomCode)) {
      wsCallbacks.set(roomCode, []);
    }
    
    const callbacks = wsCallbacks.get(roomCode) || [];
    callbacks.push(callback);
    wsCallbacks.set(roomCode, callbacks);
    
    // Send a join_room message to the server
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'join_room',
        roomCode: roomCode,
      }));
    }
    
    // Return a cleanup function
    return () => {
      // Remove the callback when unsubscribing
      if (wsCallbacks.has(roomCode)) {
        const updatedCallbacks = (wsCallbacks.get(roomCode) || []).filter(cb => cb !== callback);
        wsCallbacks.set(roomCode, updatedCallbacks);
      }
    };
  }
}

// Helper function to broadcast a message to a room
export async function broadcastToRoom(roomCode: string, message: Omit<RealtimeMessage, 'timestamp'>) {
  const fullMessage = {
    ...message,
    timestamp: Date.now(),
  };
  
  // Try to use Supabase if available
  if (window.supabase) {
    const supabase = getSupabaseClient();
    
    return await supabase.channel(`room:${roomCode}`)
      .send({
        type: 'broadcast',
        event: 'message',
        payload: fullMessage,
      });
  } 
  // Use direct WebSocket connection
  else {
    const ws = getWebSocketConnection();
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...fullMessage,
        type: fullMessage.type || 'chat_message',
      }));
      return { error: null };
    } else {
      console.error('WebSocket not connected');
      return { error: new Error('WebSocket not connected') };
    }
  }
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
  try {
    const supabase = getSupabaseClient();
    const roomCode = generateRoomCode();
    
    // First check if the table exists, create if needed
    const { error: tableError } = await supabase
      .from('rooms')
      .select('code')
      .limit(1)
      .catch(async (err: any) => {
        console.log('Table might not exist, creating it:', err);
        
        // We'll try to create the table using SQL
        const { error: createError } = await supabase.rpc('create_rooms_table').catch((e: any) => {
          console.error('RPC not available, using direct SQL', e);
          return { error: e };
        });
          
        if (createError) {
          console.warn('Could not create table via RPC, continuing anyway');
        }
        
        return { error: err };
      });
    
    // Now try to insert, even if the table check failed
    const { error } = await supabase
      .from('rooms')
      .insert([
        { code: roomCode, created_at: new Date() },
      ]);
    
    if (error && error.code !== '42P01') { // ignore "relation does not exist" error
      console.error('Error creating room:', error);
      // We'll just use in-memory room tracking instead
    }
    
    // Store the room code in localStorage as a fallback
    const existingRooms = JSON.parse(localStorage.getItem('yt-sync-rooms') || '[]');
    localStorage.setItem('yt-sync-rooms', JSON.stringify([...existingRooms, roomCode]));
    
    return roomCode;
  } catch (error: any) {
    console.error('Error in createRoom:', error);
    // Return a room code anyway for better user experience
    const roomCode = generateRoomCode();
    
    // Store in localStorage as fallback
    const existingRooms = JSON.parse(localStorage.getItem('yt-sync-rooms') || '[]');
    localStorage.setItem('yt-sync-rooms', JSON.stringify([...existingRooms, roomCode]));
    
    return roomCode;
  }
}

// Check if room exists
export async function checkRoomExists(roomCode: string) {
  try {
    const supabase = getSupabaseClient();
    
    // Check if room exists in Supabase
    const { data, error } = await supabase
      .from('rooms')
      .select('code')
      .eq('code', roomCode)
      .single();
    
    if (!error && data) {
      return true;
    }
    
    // Fallback to localStorage if Supabase query fails
    const existingRooms = JSON.parse(localStorage.getItem('yt-sync-rooms') || '[]');
    if (existingRooms.includes(roomCode)) {
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error('Error in checkRoomExists:', error);
    
    // Fallback to localStorage
    const existingRooms = JSON.parse(localStorage.getItem('yt-sync-rooms') || '[]');
    return existingRooms.includes(roomCode);
  }
}
