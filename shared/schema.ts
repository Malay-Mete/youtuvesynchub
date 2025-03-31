import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table (for anonymous users)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  sessionId: text("session_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Room table
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  active: boolean("active").default(true).notNull(),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
});

// Room member table
export const roomMembers = pgTable("room_members", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertRoomMemberSchema = createInsertSchema(roomMembers).omit({
  id: true,
  joinedAt: true,
});

// Message table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  type: text("type").default("chat").notNull(), // "chat", "command", "system"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// Video state table
export const videoStates = pgTable("video_states", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().unique(),
  videoId: text("video_id"),
  videoUrl: text("video_url"),
  title: text("title"),
  channelName: text("channel_name"),
  isPlaying: boolean("is_playing").default(false).notNull(),
  currentTime: integer("current_time").default(0).notNull(),
  playbackRate: text("playback_rate").default("1").notNull(),
  quality: text("quality").default("auto").notNull(),
  volume: integer("volume").default(100).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVideoStateSchema = createInsertSchema(videoStates).omit({
  id: true,
  updatedAt: true,
});

export const updateVideoStateSchema = createInsertSchema(videoStates).omit({
  id: true,
  roomId: true,
  updatedAt: true,
}).partial();

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type RoomMember = typeof roomMembers.$inferSelect;
export type InsertRoomMember = z.infer<typeof insertRoomMemberSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type VideoState = typeof videoStates.$inferSelect;
export type InsertVideoState = z.infer<typeof insertVideoStateSchema>;
export type UpdateVideoState = z.infer<typeof updateVideoStateSchema>;

// Command types
export const commandSchema = z.object({
  type: z.string(),
  payload: z.any(),
});

export type Command = z.infer<typeof commandSchema>;
