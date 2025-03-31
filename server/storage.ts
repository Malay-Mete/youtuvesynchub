import { 
  users, type User, type InsertUser,
  rooms, type Room, type InsertRoom,
  roomMembers, type RoomMember, type InsertRoomMember,
  messages, type Message, type InsertMessage,
  videoStates, type VideoState, type InsertVideoState, type UpdateVideoState
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserBySessionId(sessionId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Room methods
  getRoom(id: number): Promise<Room | undefined>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, active: boolean): Promise<Room | undefined>;
  
  // Room member methods
  getRoomMembers(roomId: number): Promise<RoomMember[]>;
  addRoomMember(member: InsertRoomMember): Promise<RoomMember>;
  removeRoomMember(roomId: number, userId: number): Promise<void>;
  
  // Message methods
  getRoomMessages(roomId: number): Promise<Message[]>;
  addMessage(message: InsertMessage): Promise<Message>;
  
  // Video state methods
  getVideoState(roomId: number): Promise<VideoState | undefined>;
  createVideoState(videoState: InsertVideoState): Promise<VideoState>;
  updateVideoState(roomId: number, updates: UpdateVideoState): Promise<VideoState | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rooms: Map<number, Room>;
  private roomMembers: Map<number, RoomMember>;
  private messages: Map<number, Message>;
  private videoStates: Map<number, VideoState>;
  private userIdCounter: number;
  private roomIdCounter: number;
  private memberIdCounter: number;
  private messageIdCounter: number;
  private videoStateIdCounter: number;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.roomMembers = new Map();
    this.messages = new Map();
    this.videoStates = new Map();
    this.userIdCounter = 1;
    this.roomIdCounter = 1;
    this.memberIdCounter = 1;
    this.messageIdCounter = 1;
    this.videoStateIdCounter = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserBySessionId(sessionId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.sessionId === sessionId
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }

  // Room methods
  async getRoom(id: number): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    return Array.from(this.rooms.values()).find(
      (room) => room.code === code.toUpperCase() && room.active
    );
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = this.roomIdCounter++;
    const now = new Date();
    
    // Ensure room code is uppercase
    const room: Room = { 
      ...insertRoom, 
      id, 
      code: insertRoom.code.toUpperCase(),
      createdAt: now 
    };
    
    this.rooms.set(id, room);
    return room;
  }

  async updateRoom(id: number, active: boolean): Promise<Room | undefined> {
    const room = this.rooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, active };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  // Room member methods
  async getRoomMembers(roomId: number): Promise<RoomMember[]> {
    return Array.from(this.roomMembers.values()).filter(
      (member) => member.roomId === roomId
    );
  }

  async addRoomMember(insertMember: InsertRoomMember): Promise<RoomMember> {
    const id = this.memberIdCounter++;
    const now = new Date();
    const member: RoomMember = { ...insertMember, id, joinedAt: now };
    this.roomMembers.set(id, member);
    return member;
  }

  async removeRoomMember(roomId: number, userId: number): Promise<void> {
    for (const [id, member] of this.roomMembers.entries()) {
      if (member.roomId === roomId && member.userId === userId) {
        this.roomMembers.delete(id);
        break;
      }
    }
  }

  // Message methods
  async getRoomMessages(roomId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.roomId === roomId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async addMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const now = new Date();
    const message: Message = { ...insertMessage, id, createdAt: now };
    this.messages.set(id, message);
    return message;
  }

  // Video state methods
  async getVideoState(roomId: number): Promise<VideoState | undefined> {
    return Array.from(this.videoStates.values()).find(
      (state) => state.roomId === roomId
    );
  }

  async createVideoState(insertState: InsertVideoState): Promise<VideoState> {
    const id = this.videoStateIdCounter++;
    const now = new Date();
    const state: VideoState = { ...insertState, id, updatedAt: now };
    this.videoStates.set(id, state);
    return state;
  }

  async updateVideoState(roomId: number, updates: UpdateVideoState): Promise<VideoState | undefined> {
    const state = await this.getVideoState(roomId);
    if (!state) return undefined;
    
    const now = new Date();
    const updatedState: VideoState = { ...state, ...updates, updatedAt: now };
    this.videoStates.set(state.id, updatedState);
    return updatedState;
  }
}

export const storage = new MemStorage();
