// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer } from "ws";

// server/storage.ts
var MemStorage = class {
  users;
  rooms;
  roomMembers;
  messages;
  videoStates;
  userIdCounter;
  roomIdCounter;
  memberIdCounter;
  messageIdCounter;
  videoStateIdCounter;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.rooms = /* @__PURE__ */ new Map();
    this.roomMembers = /* @__PURE__ */ new Map();
    this.messages = /* @__PURE__ */ new Map();
    this.videoStates = /* @__PURE__ */ new Map();
    this.userIdCounter = 1;
    this.roomIdCounter = 1;
    this.memberIdCounter = 1;
    this.messageIdCounter = 1;
    this.videoStateIdCounter = 1;
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async getUserBySessionId(sessionId) {
    return Array.from(this.users.values()).find(
      (user) => user.sessionId === sessionId
    );
  }
  async createUser(insertUser) {
    const id = this.userIdCounter++;
    const now = /* @__PURE__ */ new Date();
    const user = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }
  // Room methods
  async getRoom(id) {
    return this.rooms.get(id);
  }
  async getRoomByCode(code) {
    return Array.from(this.rooms.values()).find(
      (room) => room.code === code.toUpperCase() && room.active
    );
  }
  async createRoom(insertRoom) {
    const id = this.roomIdCounter++;
    const now = /* @__PURE__ */ new Date();
    const room = {
      ...insertRoom,
      id,
      code: insertRoom.code.toUpperCase(),
      createdAt: now
    };
    this.rooms.set(id, room);
    return room;
  }
  async updateRoom(id, active) {
    const room = this.rooms.get(id);
    if (!room) return void 0;
    const updatedRoom = { ...room, active };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }
  // Room member methods
  async getRoomMembers(roomId) {
    return Array.from(this.roomMembers.values()).filter(
      (member) => member.roomId === roomId
    );
  }
  async addRoomMember(insertMember) {
    const id = this.memberIdCounter++;
    const now = /* @__PURE__ */ new Date();
    const member = { ...insertMember, id, joinedAt: now };
    this.roomMembers.set(id, member);
    return member;
  }
  async removeRoomMember(roomId, userId) {
    for (const [id, member] of this.roomMembers.entries()) {
      if (member.roomId === roomId && member.userId === userId) {
        this.roomMembers.delete(id);
        break;
      }
    }
  }
  // Message methods
  async getRoomMessages(roomId) {
    return Array.from(this.messages.values()).filter((message) => message.roomId === roomId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  async addMessage(insertMessage) {
    const id = this.messageIdCounter++;
    const now = /* @__PURE__ */ new Date();
    const message = { ...insertMessage, id, createdAt: now };
    this.messages.set(id, message);
    return message;
  }
  // Video state methods
  async getVideoState(roomId) {
    return Array.from(this.videoStates.values()).find(
      (state) => state.roomId === roomId
    );
  }
  async createVideoState(insertState) {
    const id = this.videoStateIdCounter++;
    const now = /* @__PURE__ */ new Date();
    const state = { ...insertState, id, updatedAt: now };
    this.videoStates.set(id, state);
    return state;
  }
  async updateVideoState(roomId, updates) {
    const state = await this.getVideoState(roomId);
    if (!state) return void 0;
    const now = /* @__PURE__ */ new Date();
    const updatedState = { ...state, ...updates, updatedAt: now };
    this.videoStates.set(state.id, updatedState);
    return updatedState;
  }
};
var storage = new MemStorage();

// server/routes.ts
var OPEN = 1;
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  global.wss = wss;
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("WebSocket message received:", data.type);
        switch (data.type) {
          case "join_room":
            handleJoinRoom(ws, data);
            break;
          case "leave_room":
            handleLeaveRoom(ws, data);
            break;
          case "chat":
          case "chat_message":
            broadcastToRoom(data.roomCode, {
              type: "chat",
              roomCode: data.roomCode,
              username: data.username,
              message: data.message,
              timestamp: Date.now()
            });
            break;
          case "command":
            broadcastToRoom(data.roomCode, {
              type: "command",
              roomCode: data.roomCode,
              username: data.username,
              message: data.message,
              timestamp: Date.now()
            });
            break;
          case "system":
            broadcastToRoom(data.roomCode, {
              type: "system",
              roomCode: data.roomCode,
              message: data.message,
              timestamp: Date.now()
            });
            break;
          case "user_joined":
            broadcastToRoom(data.roomCode, {
              type: "user_joined",
              roomCode: data.roomCode,
              username: data.username,
              timestamp: Date.now()
            });
            break;
          case "user_left":
            broadcastToRoom(data.roomCode, {
              type: "user_left",
              roomCode: data.roomCode,
              username: data.username,
              timestamp: Date.now()
            });
            break;
          case "video_changed":
            broadcastToRoom(data.roomCode, {
              type: "video_changed",
              roomCode: data.roomCode,
              username: data.username,
              videoUrl: data.videoUrl,
              timestamp: Date.now()
            });
            break;
          case "video_state_changed":
            broadcastToRoom(data.roomCode, {
              type: "video_state_changed",
              roomCode: data.roomCode,
              username: data.username,
              videoState: data.videoState,
              timestamp: Date.now()
            });
            break;
          default:
            broadcastToRoom(data.roomCode, {
              ...data,
              timestamp: Date.now()
            });
            break;
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });
  app2.post("/api/rooms", async (req, res) => {
    try {
      const roomCode = generateRoomCode();
      await storage.createRoom({
        code: roomCode,
        createdBy: req.body.username || "Anonymous",
        active: true
      });
      res.status(201).json({ roomCode });
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });
  app2.get("/api/rooms/:roomCode", async (req, res) => {
    try {
      const { roomCode } = req.params;
      const room = await storage.getRoomByCode(roomCode);
      if (room) {
        res.status(200).json({ exists: true, room });
      } else {
        res.status(404).json({ exists: false });
      }
    } catch (error) {
      console.error("Error checking room:", error);
      res.status(500).json({ message: "Failed to check room" });
    }
  });
  app2.get("/api/status", (req, res) => {
    try {
      const wsClientCount = Array.from(wss.clients).length;
      res.status(200).json({
        status: "ok",
        websocket: {
          status: "running",
          clients: wsClientCount
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Error checking status:", error);
      res.status(500).json({
        status: "error",
        message: "Server status check failed",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  return httpServer;
}
function handleJoinRoom(ws, data) {
  ws.roomCode = data.roomCode;
  ws.username = data.username;
  broadcastToRoom(data.roomCode, {
    type: "user_joined",
    roomCode: data.roomCode,
    username: data.username,
    timestamp: Date.now()
  });
}
function handleLeaveRoom(ws, data) {
  broadcastToRoom(data.roomCode, {
    type: "user_left",
    roomCode: data.roomCode,
    username: data.username,
    timestamp: Date.now()
  });
  delete ws.roomCode;
  delete ws.username;
}
function broadcastToRoom(roomCode, message) {
  const wss = getWebSocketServer();
  wss.clients.forEach((client) => {
    if (client.roomCode === roomCode && client.readyState === OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}
function getWebSocketServer() {
  return global.wss;
}
function generateRoomCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    // ✅ Change from "dist/public" to "dist"
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5e3;
  const host = "127.0.0.1";
  server.listen(port, host, () => {
    log(`Server running at http://${host}:${port}`);
    log(`Environment: ${app.get("env").toUpperCase()}`);
  });
})();
