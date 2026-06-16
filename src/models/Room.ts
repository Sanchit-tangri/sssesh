import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isPrivate: { type: Boolean, default: false },
  password: { type: String }, // For private rooms
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  permissions: {
    allowAddSongs: { type: Boolean, default: true },
    allowControlPlayback: { type: Boolean, default: false },
  },
  currentSong: {
    title: String,
    artist: String,
    url: String,
    thumbnail: String,
    duration: Number,
  },
  queue: [{
    title: String,
    artist: String,
    url: String,
    thumbnail: String,
    duration: Number,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  }],
  playbackState: {
    playing: { type: Boolean, default: false },
    currentTime: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
}, { timestamps: true });

export const Room = mongoose.model("Room", roomSchema);
