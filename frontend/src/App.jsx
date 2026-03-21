import React, { useEffect } from 'react';
import { io } from 'socket.io-client'; // Import the client
import Sidebar from './components/Sidebar';
import ActiveRoomStats from './components/ActiveRoomStats';
import DynamicTracklist from './components/DynamicTracklist';
import FloatingMediaPlayer from './components/FloatingMediaPlayer';
import './App.css';

// Initialize the connection to your backend
const socket = io('http://localhost:5000');

function App() {
  
  // This runs once when the app starts
  useEffect(() => {
    socket.on('connect', () => {
      console.log('✅ Successfully connected to SSSesh Real-Time Engine!');
    });

    // Cleanup connection when app closes
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <ActiveRoomStats />
        <DynamicTracklist />
      </div>
      <FloatingMediaPlayer />
    </div>
  );
}
export default App;