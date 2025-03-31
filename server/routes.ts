import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket as WSWebSocket } from "ws";
import { storage } from "./storage";

// WebSocket constants
const OPEN = 1;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Set up WebSocket server for realtime communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Make it globally accessible
  global.wss = wss;
  
  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Handle messages from clients
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket message received:', data.type);
        
        // Handle different message types
        switch (data.type) {
          case 'join_room':
            handleJoinRoom(ws, data);
            break;
            
          case 'leave_room':
            handleLeaveRoom(ws, data);
            break;
            
          case 'chat':
          case 'chat_message':
            broadcastToRoom(data.roomCode, {
              type: 'chat',
              roomCode: data.roomCode,
              username: data.username,
              message: data.message,
              timestamp: Date.now(),
            });
            break;
            
          case 'command':
            broadcastToRoom(data.roomCode, {
              type: 'command',
              roomCode: data.roomCode,
              username: data.username,
              message: data.message,
              timestamp: Date.now(),
            });
            break;
          
          case 'system':
            broadcastToRoom(data.roomCode, {
              type: 'system',
              roomCode: data.roomCode,
              message: data.message,
              timestamp: Date.now(),
            });
            break;
            
          case 'user_joined':
            broadcastToRoom(data.roomCode, {
              type: 'user_joined',
              roomCode: data.roomCode,
              username: data.username,
              timestamp: Date.now(),
            });
            break;
            
          case 'user_left':
            broadcastToRoom(data.roomCode, {
              type: 'user_left',
              roomCode: data.roomCode,
              username: data.username,
              timestamp: Date.now(),
            });
            break;

          case 'video_changed':
            broadcastToRoom(data.roomCode, {
              type: 'video_changed',
              roomCode: data.roomCode,
              username: data.username,
              videoUrl: data.videoUrl,
              timestamp: Date.now(),
            });
            break;
            
          case 'video_state_changed':
            broadcastToRoom(data.roomCode, {
              type: 'video_state_changed',
              roomCode: data.roomCode,
              username: data.username,
              videoState: data.videoState,
              timestamp: Date.now(),
            });
            break;
            
          default:
            // Forward unknown message types as-is
            broadcastToRoom(data.roomCode, {
              ...data,
              timestamp: Date.now(),
            });
            break;
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    // Handle disconnections
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  // API route to create a new room
  app.post('/api/rooms', async (req, res) => {
    try {
      const roomCode = generateRoomCode();
      
      // Store room in memory
      await storage.createRoom({
        code: roomCode,
        createdBy: req.body.username || 'Anonymous',
        active: true,
      });
      
      res.status(201).json({ roomCode });
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json({ message: 'Failed to create room' });
    }
  });
  
  // API route to check if a room exists
  app.get('/api/rooms/:roomCode', async (req, res) => {
    try {
      const { roomCode } = req.params;
      const room = await storage.getRoomByCode(roomCode);
      
      if (room) {
        res.status(200).json({ exists: true, room });
      } else {
        res.status(404).json({ exists: false });
      }
    } catch (error) {
      console.error('Error checking room:', error);
      res.status(500).json({ message: 'Failed to check room' });
    }
  });
  
  // API status endpoint
  app.get('/api/status', (req, res) => {
    try {
      const wsClientCount = Array.from(wss.clients).length;
      res.status(200).json({
        status: 'ok',
        websocket: {
          status: 'running',
          clients: wsClientCount
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking status:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Server status check failed',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  return httpServer;
}

// WebSocket handlers
function handleJoinRoom(ws: any, data: any) {
  // Add the client to the room
  ws.roomCode = data.roomCode;
  ws.username = data.username;
  
  // Broadcast to all clients in the room
  broadcastToRoom(data.roomCode, {
    type: 'user_joined',
    roomCode: data.roomCode,
    username: data.username,
    timestamp: Date.now(),
  });
}

function handleLeaveRoom(ws: any, data: any) {
  broadcastToRoom(data.roomCode, {
    type: 'user_left',
    roomCode: data.roomCode,
    username: data.username,
    timestamp: Date.now(),
  });
  
  // Remove room association
  delete ws.roomCode;
  delete ws.username;
}

// Helper to broadcast to all clients in a room
function broadcastToRoom(roomCode: string, message: any) {
  const wss = getWebSocketServer();
  
  wss.clients.forEach((client: any) => {
    if (client.roomCode === roomCode && client.readyState === OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Helper to get the WebSocket server
function getWebSocketServer() {
  return (global as any).wss;
}

// Generate a random room code
function generateRoomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Make WebSocket server accessible globally
declare global {
  var wss: WebSocketServer;
}
