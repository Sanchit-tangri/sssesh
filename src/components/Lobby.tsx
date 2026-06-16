import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Plus, Users, Lock, Music2, Search, LogOut, RefreshCw } from "lucide-react";

export default function Lobby() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      console.log("Lobby: Fetching rooms...");
      const res = await fetch("/api/rooms");
      const data = await res.json();
      console.log("Lobby: Rooms fetched:", data.length);
      setRooms(data);
    } catch (err) {
      console.error("Lobby: Fetch rooms error:", err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Lobby: Creating room:", roomName, isPrivate ? "(Private)" : "(Public)");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: roomName, isPrivate }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log("Lobby: Room created successfully:", data._id);
        navigate(`/room/${data._id}`);
      } else {
        console.error("Lobby: Room creation failed:", data.error);
      }
    } catch (err) {
      console.error("Lobby: Create room exception:", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter text-white mb-2">Discover Rooms</h1>
          <p className="text-white/50">Join a session or start your own</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 glass-card rounded-full">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold">
              {user?.username[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium">{user?.username}</span>
            <button onClick={logout} className="p-1 hover:text-orange-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={fetchRooms}
            className="p-3 glass-card rounded-full hover:bg-white/10 transition-colors"
            title="Refresh Rooms"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-orange-500 hover:text-white transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Room
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-card">
            <Search className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white/50 mb-2">No rooms found</h3>
            <p className="text-white/30 text-sm">Be the first to start a session!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <motion.div
              key={room._id}
              whileHover={{ y: -5 }}
              className="p-6 glass-card group cursor-pointer"
              onClick={() => navigate(`/room/${room._id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-orange-500/20 transition-colors">
                  <Music2 className="w-6 h-6 text-orange-500" />
                </div>
                {room.isPrivate && <Lock className="w-4 h-4 text-white/30" />}
              </div>
              <h3 className="text-xl font-bold mb-1">{room.name}</h3>
              <p className="text-sm text-white/50 mb-4">Hosted by {room.host?.username || "Unknown"}</p>
              <div className="flex items-center gap-4 text-sm text-white/30">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {room.members?.length || 0}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-8 glass-card"
          >
            <h2 className="text-2xl font-bold mb-6">Create New Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm text-white/50 mb-2">Room Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 text-white"
                  placeholder="Late Night Vibes"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="private"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-5 h-5 rounded border-white/10 bg-white/5 accent-orange-500"
                />
                <label htmlFor="private" className="text-sm text-white/70">Private Room (Requires approval)</label>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
