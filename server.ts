import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import authRoutes from "./src/routes/auth.ts";
import roomRoutes from "./src/routes/rooms.ts";
import { searchSongs } from "./src/services/musicService.ts";
console.log("Environment variables loaded from .env");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("Server root path:", __dirname);
console.log("Current working directory:", process.cwd());

async function startServer() {
  console.log("Starting SSSesh Server...");
  const app = express();
  const httpServer = createServer(app);
  console.log("HTTP server created");
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  console.log("Socket.io server instance initialized");

  const PORT = 3000;
  console.log(`Server will listen on port: ${PORT}`);

  // MongoDB Connection
  const MONGODB_URI = process.env.MONGODB_URI || "";
  console.log("Connecting to MongoDB...");

  const connectWithRetry = () => {
    mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      family: 4, // Force IPv4 to prevent connection resets on some networks
    })
      .then(() => console.log("✅ Successfully connected to MongoDB"))
      .catch((err) => {
        console.error("❌ CRITICAL: MongoDB connection error!");
        console.error("--------------------------------------------------");
        if (err.message.includes("whitelist") || err.name === "MongooseServerSelectionError") {
          console.error("SECURITY ALERT: Your current network is blocked by MongoDB Atlas.");
          console.error("ACTION REQUIRED: Log into Atlas -> Network Access -> Add '0.0.0.0/0'");
        }
        console.error("--------------------------------------------------");
        console.error("Error Message:", err.message);

        // Retry connection after 5 seconds
        console.log("Retrying connection in 5 seconds...");
        setTimeout(connectWithRetry, 5000);
      });
  };

  connectWithRetry();

  console.log("Initializing CORS with origin: *");
  app.use(cors());
  console.log("Initializing JSON body parser");
  app.use(express.json());

  // API Routes
  console.log("Registering API routes...");
  app.use("/api/auth", authRoutes);
  app.use("/api/rooms", roomRoutes);

  app.get("/api/search", async (req, res) => {
    const { q } = req.query;
    console.log("API Search Request for:", q);

    if (!q) {
      console.warn("Search attempt with no query");
      return res.status(400).json({ error: "Query required" });
    }

    try {
      const results = await searchSongs(q as string);
      console.log(`Search for "${q}" returned ${results.length} results`);
      res.json(results);
    } catch (error: any) {
      console.error("Search API crash:", error);
      res.status(500).json({ error: "Internal search error", message: error.message });
    }
  });

  app.get("/api/health", (req, res) => {
    console.log("Health check request received");
    res.json({ status: "ok" });
  });

  // Socket.io Logic
  console.log("Initializing Socket.io logic...");
  console.log("Socket.io logic initialized");

  io.on("connection", (socket) => {
    console.log(`New socket connection: ${socket.id} from ${socket.handshake.address}`);

    socket.on("join-room", async ({ roomId, user }) => {
      try {
        const room = await mongoose.model("Room").findById(roomId).populate("host") as any;
        if (!room) return;

        const isHost = room.host._id.toString() === user.id;
        const isMember = room.members.some((m: any) => m.toString() === user.id);

        if (isHost || isMember) {
          socket.join(roomId);
          (socket as any).roomId = roomId;
          (socket as any).userData = user;

          if (!isMember) {
            room.members.push(user.id);
            await room.save();
          }

          const fullRoom = await mongoose.model("Room").findById(roomId).populate("host").populate("members");

          socket.emit("room-state", {
            playbackState: (fullRoom as any).playbackState,
            currentSong: (fullRoom as any).currentSong,
            queue: (fullRoom as any).queue,
            members: (fullRoom as any).members,
            host: (fullRoom as any).host,
            isAuthorized: true
          });

          io.to(roomId).emit("members-updated", (fullRoom as any).members);

          if (!isMember) {
            io.to(roomId).emit("new-message", {
              id: Math.random().toString(),
              user: "SYSTEM",
              text: `${user.username} entered the session.`,
              timestamp: new Date()
            });
          }
        } else {
          // User is a guest, needs permission
          console.log(`Knock-Knock: ${user.username} wants to join ${roomId}`);

          // Send request to room (host will pick it up)
          io.to(roomId).emit("join-request", { user, socketId: socket.id });

          // Inform the guest they are waiting
          socket.emit("room-state", {
            name: room.name,
            isAuthorized: false,
            waiting: true
          });
        }
      } catch (err) {
        console.error("Error in join-room:", err);
      }
    });

    socket.on("approve-request", async ({ roomId, guestUser, guestSocketId }) => {
      try {
        const room = await mongoose.model("Room").findById(roomId) as any;
        if (!room) return;

        const isGuestMember = room.members.some((m: any) => m.toString() === guestUser.id);
        if (!isGuestMember) {
          room.members.push(guestUser.id);
          await room.save();
        }

        const fullRoom = await mongoose.model("Room").findById(roomId).populate("host").populate("members");

        // Tell the guest they are in
        const guestSocket = io.sockets.sockets.get(guestSocketId);
        if (guestSocket) {
          guestSocket.join(roomId);
          (guestSocket as any).roomId = roomId;
          (guestSocket as any).userData = guestUser;

          guestSocket.emit("request-approved", {
            playbackState: (fullRoom as any).playbackState,
            currentSong: (fullRoom as any).currentSong,
            queue: (fullRoom as any).queue,
            members: (fullRoom as any).members,
            host: (fullRoom as any).host,
            isAuthorized: true
          });
        }

        // Broadcast updated members to everyone
        io.to(roomId).emit("members-updated", (fullRoom as any).members);

        io.to(roomId).emit("new-message", {
          id: Math.random().toString(),
          user: "SYSTEM",
          text: `${guestUser.username} was approved to join!`,
          timestamp: new Date()
        });
      } catch (err) {
        console.error("Error approving request:", err);
      }
    });

    socket.on("deny-request", ({ guestSocketId }) => {
      const guestSocket = io.sockets.sockets.get(guestSocketId);
      if (guestSocket) {
        guestSocket.emit("request-denied");
      }
    });

    socket.on("sync-playback", async ({ roomId, playbackState }) => {
      // playbackState: { playing: boolean, currentTime: number, song: any }
      console.log(`Syncing playback for room ${roomId} (Host: ${socket.id}):`, playbackState.playing ? "Playing" : "Paused", "@", playbackState.currentTime);

      try {
        await mongoose.model("Room").findByIdAndUpdate(roomId, { playbackState });
      } catch (err) {
        console.error("Error updating playback in DB:", err);
      }

      console.log(`Broadcasting playback-updated for room ${roomId}`);
      socket.to(roomId).emit("playback-updated", playbackState);
    });

    socket.on("send-message", ({ roomId, message }) => {
      console.log(`New message in room ${roomId} from ${message.user} (${socket.id}): ${message.text.substring(0, 20)}...`);
      console.log(`Broadcasting new-message for room ${roomId}`);
      socket.to(roomId).emit("new-message", message);
    });

    socket.on("disconnect", async (reason) => {
      const { roomId, userData } = socket as any;
      console.log(`User disconnected: ${socket.id} (${userData?.username || 'Unknown'}). Reason: ${reason}`);

      if (roomId && userData) {
        try {
          const room = await mongoose.model("Room").findById(roomId) as any;
          if (room) {
            room.members = room.members.filter((m: any) => m.id !== userData.id);
            await room.save();
            io.to(roomId).emit("members-updated", room.members);

            // System message for leave
            const leaveMsg = {
              id: Math.random().toString(),
              user: "SYSTEM",
              text: `${userData.username} left the building.`,
              timestamp: new Date()
            };
            io.to(roomId).emit("new-message", leaveMsg);
          }
        } catch (err) {
          console.error("Error updating members on disconnect:", err);
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in DEVELOPMENT mode");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    console.log("Vite development middleware initialized");
    app.use(vite.middlewares);
  } else {
    console.log("Running in PRODUCTION mode");
    const distPath = path.join(process.cwd(), "dist");
    console.log("Serving static files from:", distPath);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      console.log(`SPA fallback for: ${req.url}`);
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`SSSesh Server is live at http://0.0.0.0:${PORT}`);
    console.log("Environment:", process.env.NODE_ENV || "development");
    console.log("Ready for connections!");
  });
}

console.log("Initializing SSSesh application...");
startServer();
