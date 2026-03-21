import React from 'react';

const Sidebar = () => {
  return (
    <div className="sidebar" style={{ width: '250px', borderRight: '1px solid #333', padding: '20px' }}>
      <h2>SSSesh</h2>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        <li>Home</li>
        <li>Discover Rooms</li>
        <li>Your Library</li>
      </ul>
      
      <hr style={{ borderColor: '#333', margin: '20px 0' }} />
      
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        <li>+ New Jam Session</li>
        <li style={{ color: '#a855f7' }}>🔊 Active Room</li>
      </ul>
    </div>
  );
};

export default Sidebar;