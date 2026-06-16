import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import { io, Socket } from "socket.io-client";
import ReactPlayer from "react-player";
const PlayerComponent = ReactPlayer as any;
import { motion, AnimatePresence } from "motion/react";
import {
  Play, Pause, SkipForward, SkipBack, Volume2,
  MessageSquare, Users, Plus, Heart, Send,
  ChevronLeft, Settings, Trash2, CheckCircle2,
  Lock as LockIcon, Music2, RefreshCw, List, Monitor
} from "lucide-react";
import { cn } from "../lib/utils.ts";

import SongSearch from "./SongSearch.tsx";

interface Song {
  title: string;
  artist: string;
  url: string;
  thumbnail: string;
  duration: number;
}

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
}

export default function Room() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Room State
  const [room, setRoom] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Player Visibility / UI
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"chat" | "queue" | "members">("chat");

  // Player Engine State
  const [isPlaying, setIsPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [muted, setMuted] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);

  // Interaction Control
  const [hasInteracted, setHasInteracted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [denied, setDenied] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const playerRef = useRef<any>(null);

  // Connection Watchdog
  useEffect(() => {
    let timer: any;
    if (room?.currentSong && !playerReady) {
      timer = setTimeout(() => {
        if (!playerReady) {
          console.warn("⚠️ Player handshake taking too long...");
          setError("Connection Timeout: Is this video restricted? Try Skip or Search another version.");
        }
      }, 30000); // 30 second timeout for reliable local connections
    }
    return () => clearTimeout(timer);
  }, [room?.currentSong, playerReady]);
  useEffect(() => {
    fetchRoom();

    const handleInteraction = () => {
      console.log("👆 Global Unlock Executed");
      setHasInteracted(true);
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
    window.addEventListener("click", handleInteraction);
    window.addEventListener("keydown", handleInteraction);

    socketRef.current = io("/", { auth: { token } });
    socketRef.current.emit("join-room", { roomId: id, user });

    socketRef.current.on("room-state", (state) => {
      console.log("📡 Initial Room State:", state);
      if (state.isAuthorized === false) {
        setIsAuthorized(false);
        setRoom(state);
        return;
      }

      setIsAuthorized(true);
      if (state.playbackState) setIsPlaying(state.playbackState.playing);
      if (state.currentSong) {
        setRoom((prev: any) => ({ ...prev, ...state, currentSong: state.currentSong }));
      } else {
        setRoom((prev: any) => ({ ...prev, ...state }));
      }

      // Auto-seek to server time if playing
      if (state.playbackState?.currentTime > 0) {
        setTimeout(() => {
          playerRef.current?.seekTo(state.playbackState.currentTime, "seconds");
        }, 1500);
      }
    });

    socketRef.current.on("join-request", (request) => {
      console.log("🔔 New Join Request:", request);
      setPendingRequests(prev => [...prev, request]);
    });

    socketRef.current.on("request-approved", (state) => {
      console.log("✅ Request Approved!");
      setIsAuthorized(true);
      setRoom(prev => ({ ...prev, ...state }));
    });

    socketRef.current.on("request-denied", () => {
      setDenied(true);
    });

    socketRef.current.on("playback-updated", (state) => {
      console.log("📡 Playback Update:", state);
      setIsPlaying(state.playing);
      if (state.song) {
        setRoom((prev: any) => ({ ...prev, currentSong: state.song }));
      }
      if (!seeking && state.currentTime !== undefined) {
        const diff = Math.abs((playerRef.current?.getCurrentTime() || 0) - state.currentTime);
        if (diff > 3) {
          playerRef.current?.seekTo(state.currentTime, "seconds");
        }
      }
    });

    socketRef.current.on("new-message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socketRef.current.on("members-updated", (members) => {
      console.log("👥 Members Updated:", members);
      setRoom((prev: any) => prev ? ({ ...prev, members }) : null);
    });

    return () => {
      socketRef.current?.disconnect();
      window.removeEventListener("click", handleInteraction);
    };
  }, [id]);

  // 2. Playback Watchdog - The "Force Engine"
  useEffect(() => {
    if (isPlaying && hasInteracted && playerReady) {
      setMuted(false);
      // Directly poke the YouTube API
      const internal = playerRef.current?.getInternalPlayer();
      if (internal && internal.playVideo) {
        internal.playVideo();
      }
    }
  }, [isPlaying, hasInteracted, playerReady]);

  const fetchRoom = async () => {
    try {
      const res = await fetch(`/api/rooms/${id}`);
      if (!res.ok) throw new Error("Room not found");
      const data = await res.json();
      setRoom(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePlayPause = () => {
    const newState = !isPlaying;
    setIsPlaying(newState);

    // Immediate local engine nudge
    const internal = playerRef.current?.getInternalPlayer();
    if (newState) internal?.playVideo?.();
    else internal?.pauseVideo?.();

    socketRef.current?.emit("sync-playback", {
      roomId: id,
      playbackState: {
        playing: newState,
        currentTime: playerRef.current?.getCurrentTime() || 0,
      }
    });
  };

  const handleSeekMouseUp = (e: any) => {
    setSeeking(false);
    const newPos = parseFloat(e.target.value);
    playerRef.current?.seekTo(newPos);
    socketRef.current?.emit("sync-playback", {
      roomId: id,
      playbackState: {
        playing: isPlaying,
        currentTime: newPos * duration,
      }
    });
  };

  const handleProgress = (state: any) => {
    if (!seeking) setPlayed(state.played);
  };

  const handlePlayerReady = () => {
    console.log("✅ YouTube Engine Ready");
    setPlayerReady(true);
    setIsBuffering(false);
  };

  const handleError = (e: any) => {
    console.error("❌ Player Error:", e);
    setError("Embed Restricted: Skipping to next song...");
    setTimeout(() => {
      handleNext();
      setError(null);
    }, 3000);
  };

  const handleAddSong = async (song: any) => {
    try {
      const res = await fetch(`/api/rooms/${id}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ song }),
      });
      const data = await res.json();
      if (res.ok) {
        setRoom(data);
        setShowSearch(false);
        setSidebarTab("queue");
        socketRef.current?.emit("sync-playback", {
          roomId: id,
          playbackState: { playing: true, currentTime: 0, song: data.currentSong }
        });
      }
    } catch (err) { console.error(err); }
  };

  const handleNext = async () => {
    try {
      setPlayerReady(false);
      setError(null);
      const res = await fetch(`/api/rooms/${id}/next`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setRoom(data);
        setIsPlaying(!!data.currentSong);
        setPlayerKey(k => k + 1); // Refresh player for new URL
        socketRef.current?.emit("sync-playback", {
          roomId: id,
          playbackState: { playing: !!data.currentSong, currentTime: 0, song: data.currentSong }
        });
      }
    } catch (err) { console.error(err); }
  };

  const handleForceSync = () => {
    console.log("🔄 Hard Refreshing Audio Engine...");
    setPlayerReady(false);
    setPlayerKey(k => k + 1);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 200);
  };

  const handleApprove = (request: any) => {
    socketRef.current?.emit("approve-request", {
      roomId: id,
      guestUser: request.user,
      guestSocketId: request.socketId
    });
    setPendingRequests(prev => prev.filter(r => r.socketId !== request.socketId));
  };

  const handleDeny = (request: any) => {
    socketRef.current?.emit("deny-request", {
      guestSocketId: request.socketId
    });
    setPendingRequests(prev => prev.filter(r => r.socketId !== request.socketId));
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = {
      id: Math.random().toString(),
      user: user?.username || "Guest",
      text: newMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, msg]);
    socketRef.current?.emit("send-message", { roomId: id, message: msg });
    setNewMessage("");
  };

  if (!room) return <div className="flex h-screen bg-[#050505] items-center justify-center text-white/20 font-mono text-xs uppercase tracking-[0.4em] animate-pulse">Initializing SSSesh...</div>;

  if (denied) {
    return (
      <div className="flex h-screen bg-[#050505] items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-8 mx-auto border border-red-500/20">
            <LockIcon className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Entry Denied</h2>
          <p className="text-white/40 text-xs mb-8 uppercase tracking-widest font-bold max-w-xs mx-auto leading-relaxed">
            The host has declined your request to join this session.
          </p>
          <button onClick={() => navigate("/")} className="px-10 py-4 bg-white/5 text-white/40 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white hover:text-black transition-all">Back to Dashboard</button>
        </motion.div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen bg-[#050505] items-center justify-center p-6 text-center">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-8 mx-auto border border-orange-500/20 animate-pulse">
            <LockIcon className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Knock Knock</h2>
          <p className="text-white/40 text-xs mb-8 uppercase tracking-widest font-bold max-w-xs mx-auto leading-relaxed">
            Hold tight. We've sent a request to the host to let you in.
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-orange-500 font-black uppercase tracking-[0.3em]">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Waiting for approval
          </div>
        </motion.div>
      </div>
    );
  }

  const isHost = user?.id === room.host?._id || user?.id === room.host;

  return (
    <div className="flex h-screen overflow-hidden bg-[#050505] text-white selection:bg-orange-500/30">
      {/* 1. Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black/40 backdrop-blur-2xl z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="p-2 -ml-2 text-white/30 hover:text-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <h1 className="text-sm font-black uppercase tracking-widest truncate max-w-[200px]">{room.name}</h1>
            <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-white/30 uppercase font-bold tracking-tighter">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              {room.members.length} active
              {isHost && pendingRequests.length > 0 && (
                <div className="flex items-center gap-1.5 h-5 px-2 bg-orange-500/10 border border-orange-500/20 rounded-full ml-4 animate-bounce">
                  <span className="w-1 h-1 rounded-full bg-orange-500 animate-ping" />
                  <span className="text-orange-500 text-[8px] font-black">{pendingRequests.length} REQUESTS</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="h-9 px-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 hover:bg-orange-500 hover:text-white transition-all active:scale-95 shadow-lg"
            >
              <Plus className="w-3 h-3" /> Add Track
            </button>
            <div className="w-[1px] h-6 bg-white/10 mx-2" />
            <div className="flex bg-white/5 rounded-lg p-1">
              {[
                { id: "chat", icon: MessageSquare },
                { id: "queue", icon: List },
                { id: "members", icon: Users }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSidebarTab(tab.id as any)}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    sidebarTab === tab.id ? "bg-white/10 text-white shadow-inner" : "text-white/20 hover:text-white/40"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 relative bg-black flex items-center justify-center group">
          {room.currentSong ? (
            <div className="absolute inset-0">
              {/* VIDEO ENGINE */}
              <div className="absolute inset-0 z-10 bg-black flex items-center justify-center">
                <PlayerComponent
                  key={`${(room.currentSong.id || room.currentSong.url)}-${playerKey}`}
                  ref={playerRef}
                  url={room.currentSong.id ? `https://www.youtube.com/watch?v=${room.currentSong.id}` : room.currentSong.url}
                  playing={isPlaying}
                  volume={volume}
                  muted={muted}
                  width="100%"
                  height="100%"
                  onReady={handlePlayerReady}
                  onStart={() => { setIsPlaying(true); setMuted(false); }}
                  onProgress={handleProgress}
                  onDuration={setDuration}
                  onError={handleError}
                  onEnded={handleNext}
                  onBuffer={() => setIsBuffering(true)}
                  onBufferEnd={() => setIsBuffering(false)}
                  playsinline
                  config={{
                    youtube: {
                      playerVars: {
                        autoplay: 1,
                        controls: 1,
                        modestbranding: 1,
                        rel: 0,
                        enablejsapi: 1,
                        iv_load_policy: 3
                      }
                    }
                  }}
                />
              </div>

              {/* UNLOCK OVERLAY */}
              {!hasInteracted && (
                <div onClick={() => setHasInteracted(true)} className="absolute inset-0 z-50 bg-black/60 backdrop-blur-3xl cursor-pointer flex flex-col items-center justify-center group/unlock">
                   <motion.div
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                   >
                     <div className="w-24 h-24 bg-white/5 rounded-full border border-white/10 flex items-center justify-center mb-8 group-hover/unlock:bg-orange-600 group-hover/unlock:border-orange-500 transition-all duration-500">
                        <Play className="w-8 h-8 fill-current translate-x-1" />
                     </div>
                     <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white/40 group-hover/unlock:text-white transition-colors">Tap to Start Stream</span>
                   </motion.div>
                </div>
              )}

              {/* OVERLAY CONTROLS */}
              <div className="absolute inset-0 z-40 bg-gradient-to-t from-black/95 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-12 pointer-events-none group-hover:pointer-events-auto">
                <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-500">
                  <h2 className="text-4xl font-black tracking-tighter mb-2 line-clamp-2">{room.currentSong.title}</h2>
                  <p className="text-white/40 text-sm font-medium uppercase tracking-widest">{room.currentSong.artist}</p>

                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative group/prog">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-orange-500"
                        style={{ width: `${played * 100}%` }}
                      />
                      <input
                        type="range" min={0} max={0.999} step="any" value={played}
                        onMouseDown={() => setSeeking(true)} onChange={(e) => setPlayed(parseFloat(e.target.value))}
                        onMouseUp={handleSeekMouseUp}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-white/30 uppercase">{formatTime(played * duration)} / {formatTime(duration)}</span>
                  </div>

                  <div className="mt-8 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                       <button onClick={handlePlayPause} className="hover:scale-110 active:scale-95 transition-transform text-white/80 hover:text-white">
                         {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current translate-x-0.5" />}
                       </button>
                       <button onClick={handleNext} className="hover:scale-110 transition-transform text-white/30 hover:text-white">
                         <SkipForward className="w-6 h-6 fill-current" />
                       </button>
                       <div className="flex items-center gap-4 group/vol">
                         <Volume2 className="w-4 h-4 text-white/30" />
                         <input
                           type="range" min={0} max={1} step="any" value={volume}
                           onChange={(e) => setVolume(parseFloat(e.target.value))}
                           className="w-24 h-1 bg-white/10 rounded-full accent-white"
                         />
                       </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {room.currentSong && !playerReady && (
                        <button onClick={handleNext} className="text-[9px] font-black uppercase tracking-widest text-orange-500 underline underline-offset-4 hover:text-white transition-colors">
                          Skip Problematic Video
                        </button>
                      )}
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full">
                        <div className={cn("w-2 h-2 rounded-full", playerReady ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-orange-500 animate-pulse")} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{playerReady ? "Active" : "Connecting"}</span>
                      </div>
                      <button onClick={handleForceSync} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all" title="Reset Force Engine">
                        <RefreshCw className="w-4 h-4 text-white/30" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
               <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-8 mx-auto grayscale opacity-50">
                 <Music2 className="w-10 h-10" />
               </div>
               <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Dance Floor Empty</h2>
               <p className="text-white/20 text-xs mb-8 uppercase tracking-widest font-bold">Add a track to start the sssesh</p>
               <button onClick={() => setShowSearch(true)} className="px-10 py-4 bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-orange-600 hover:text-white transition-all active:scale-95">Search Music</button>
            </div>
          )}

          {/* STATUS TOAST */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="absolute top-12 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4"
              >
                <div className="bg-orange-600 rounded-3xl shadow-2xl border border-orange-400/30 overflow-hidden">
                  <div className="p-4 flex items-center gap-4">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Monitor className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white leading-tight">
                        {error}
                      </p>
                    </div>
                  </div>
                  {room?.currentSong && (
                    <a
                      href={room.currentSong.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full py-3 bg-black/20 hover:bg-black/40 text-center text-[9px] font-black uppercase tracking-[0.2em] text-white/80 transition-all border-t border-white/5"
                    >
                      Open Direct Link to Verify
                    </a>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* 2. Right Sidebar */}
      <aside className="w-[340px] border-l border-white/5 bg-[#0a0a0a]/80 backdrop-blur-3xl flex flex-col z-50">
        <div className="p-6 border-b border-white/5">
           <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
             {sidebarTab === 'chat' && 'Live Logs'}
             {sidebarTab === 'queue' && 'Upcoming Vibez'}
             {sidebarTab === 'members' && 'Presence Dashboard'}
           </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {sidebarTab === "chat" && (
            <div className="space-y-6">
              {messages.map((m) => (
                <div key={m.id} className="group/msg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-500">{m.user}</span>
                    <span className="text-[8px] font-mono text-white/10">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm text-white/70 group-hover/msg:text-white/90 transition-colors leading-relaxed">{m.text}</p>
                </div>
              ))}
            </div>
          )}

          {sidebarTab === 'queue' && (
            <div className="space-y-4">
              {room.queue?.map((s: any, i: number) => (
                <div key={i} className="flex gap-4 p-3 rounded-2xl hover:bg-white/5 group/song transition-all">
                   <div className="relative w-14 h-14 flex-shrink-0">
                     <img src={s.thumbnail} className="w-full h-full object-cover rounded-xl shadow-lg" alt="" />
                     <div className="absolute inset-0 bg-orange-600/60 rounded-xl opacity-0 group-hover/song:opacity-100 flex items-center justify-center transition-all">
                       <Play className="w-5 h-5 fill-current" />
                     </div>
                   </div>
                   <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <p className="text-xs font-black truncate mb-1">{s.title}</p>
                     <p className="text-[9px] font-bold text-white/20 uppercase truncate tracking-tighter">{s.artist}</p>
                   </div>
                </div>
              ))}
            </div>
          )}

          {sidebarTab === "members" && (
            <div className="space-y-8">
              {isHost && pendingRequests.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                    Pending Requests
                  </h4>
                  {pendingRequests.map((req) => (
                    <div key={req.socketId} className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[10px] font-black uppercase">
                          {req.user.username[0]}
                        </div>
                        <span className="text-xs font-bold truncate">{req.user.username}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleApprove(req)}
                          className="py-2 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-500 hover:text-white transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDeny(req)}
                          className="py-2 bg-white/5 text-white/40 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-all"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="h-[1px] bg-white/5 mt-8 shadow-inner" />
                </div>
              )}

              <div className="space-y-6">
                {room.members.map((m: any) => (
                  <div key={m._id || m.id} className="flex items-center gap-4 group/member">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-xs font-black uppercase tracking-tighter shadow-inner group-hover/member:border-orange-500/50 transition-colors">
                      {m.username[0]}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white/60 group-hover/member:text-white transition-colors">{m.username}</span>
                      {(m._id === room.host?._id || m.id === room.host?._id || m.id === room.host) && (
                        <span className="text-[7px] text-orange-500 font-black uppercase tracking-[0.2em] mt-1">Primary Host</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {sidebarTab === 'chat' && (
          <form onSubmit={sendMessage} className="p-6 border-t border-white/5 bg-black/40">
             <div className="relative">
               <input
                 value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                 placeholder="Type a message..."
                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-all font-medium"
               />
               <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/20 hover:text-white">
                 <Send className="w-4 h-4" />
               </button>
             </div>
          </form>
        )}
      </aside>

      {/* 3. Search Overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-8">
           <motion.div
             initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
             className="w-full max-w-2xl"
           >
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-5xl font-black uppercase tracking-tighter">Add Track</h2>
                  <p className="text-white/20 text-sm mt-1 uppercase tracking-widest font-bold">Search global database</p>
                </div>
                <button onClick={() => setShowSearch(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Trash2 className="w-5 h-5 text-white/30" />
                </button>
              </div>
              <SongSearch onAdd={handleAddSong} />
           </motion.div>
        </div>
      )}
    </div>
  );
}
