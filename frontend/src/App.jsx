import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import SpotifySearch from './components/SpotifySearch';
import ActiveRoomStats from './components/ActiveRoomStats';
import DynamicTracklist from './components/DynamicTracklist';
import FloatingMediaPlayer from './components/FloatingMediaPlayer';
import './App.css';

// Initialize the connection to your backend real-time engine
const socket = io('http://localhost:5000');

function App() {
  
  // This runs once when the app starts
  useEffect(() => {
    // 1. Check if Spotify just sent us back with an auth token
    const urlParams = new URLSearchParams(window.location.search);
    const spotifyToken = urlParams.get('token');

    if (spotifyToken) {
      console.log('🎵 Successfully grabbed Spotify Token!');
      // Save it to local storage so we don't lose it when refreshing
      localStorage.setItem('spotifyAccessToken', spotifyToken);
      // Clean up the URL so it looks pretty again without the giant token string
      window.history.pushState({}, null, '/');
    }

    // 2. Listen for a successful Socket connection
    socket.on('connect', () => {
      console.log('✅ Successfully connected to SSSesh Real-Time Engine!');
    });

    // Cleanup connection when the app is closed or unmounted
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="app-container">
      {/* Left Navigation */}
      <Sidebar />
      
      {/* Center Dashboard */}
      <div className="main-content">
        <SpotifySearch />
        <ActiveRoomStats />
        <DynamicTracklist />
      </div>

      {/* Bottom Anchored Player */}
      <FloatingMediaPlayer />
    </div>
  );
}

export default App;