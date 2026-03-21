import React from 'react';

const DynamicTracklist = () => {
  // Temporary dummy data until we connect the database
  const tracks = [
    { id: 1, title: 'Khat', artist: 'Navjot Singh', queuedBy: 'Sanchit', time: '4:03' },
    { id: 2, title: 'Starboy', artist: 'The Weeknd, Daft Punk', queuedBy: 'Sarah', time: '3:50' },
    { id: 3, title: 'Instant Crush', artist: 'Daft Punk', queuedBy: 'Janshrut', time: '5:38' },
  ];

  return (
    <div className="tracklist-container">
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #444', color: '#888' }}>
            <th>#</th>
            <th>TRACK</th>
            <th>QUEUED BY</th>
            <th>TIME</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track) => (
            <tr key={track.id} style={{ borderBottom: '1px solid #222' }}>
              <td>{track.id}</td>
              <td>
                <div>{track.title}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>{track.artist}</div>
              </td>
              <td>{track.queuedBy}</td>
              <td>{track.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DynamicTracklist;