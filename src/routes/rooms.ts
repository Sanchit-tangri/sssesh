import express from "express";
import { Room } from "../models/Room.ts";
import { User } from "../models/User.ts";
import jwt from "jsonwebtoken";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

const auth = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

router.post("/", auth, async (req: any, res) => {
  try {
    const { name, isPrivate, password } = req.body;
    const room = new Room({ name, isPrivate, password, host: req.userId, members: [req.userId] });
    await room.save();
    res.status(201).json(room);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find().populate("host", "username").sort({ createdAt: -1 });
    res.json(rooms);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate("host", "username").populate("members", "username").populate("pendingRequests", "username");
    res.json(room);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post("/:id/request-join", auth, async (req: any, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    if (room.members.includes(req.userId)) return res.status(400).json({ error: "Already member" });
    if (!room.pendingRequests.includes(req.userId)) {
      room.pendingRequests.push(req.userId);
      await room.save();
    }
    res.json({ message: "Request sent" });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post("/:id/approve-request", auth, async (req: any, res) => {
  try {
    const { userId } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room || room.host.toString() !== req.userId) return res.status(403).json({ error: "Forbidden" });
    room.pendingRequests = room.pendingRequests.filter(id => id.toString() !== userId);
    if (!room.members.includes(userId)) room.members.push(userId);
    await room.save();
    res.json(room);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/:id/playback", auth, async (req: any, res) => {
  try {
    const { currentSong, playbackState } = req.body;
    const room = await Room.findById(req.params.id);
    if (currentSong) room.currentSong = currentSong;
    if (playbackState) room.playbackState = playbackState;
    await room.save();
    res.json(room);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post("/:id/queue", auth, async (req: any, res) => {
  try {
    const { song } = req.body;
    const room = await Room.findById(req.params.id);
    room.queue.push({ ...song, addedBy: req.userId });
    if (!room.currentSong?.url) {
      room.currentSong = song;
      room.playbackState = { playing: true, currentTime: 0, lastUpdated: new Date() };
    }
    await room.save();
    res.json(room);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post("/:id/next", auth, async (req: any, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (room.queue.length > 0) {
      room.currentSong = room.queue.shift();
      room.playbackState = { playing: true, currentTime: 0, lastUpdated: new Date() };
    } else {
      room.currentSong = undefined;
      room.playbackState = { playing: false, currentTime: 0, lastUpdated: new Date() };
    }
    await room.save();
    res.json(room);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post("/:id/play-from-queue", auth, async (req: any, res) => {
  try {
    const { index } = req.body;
    const room = await Room.findById(req.params.id);
    if (index >= 0 && index < room.queue.length) {
      room.currentSong = room.queue.splice(index, 1)[0];
      room.playbackState = { playing: true, currentTime: 0, lastUpdated: new Date() };
      await room.save();
      res.json(room);
    } else { res.status(400).json({ error: "Invalid index" }); }
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;