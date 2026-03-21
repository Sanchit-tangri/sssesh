import React, { useState } from 'react';
import axios from 'axios';

const SpotifySearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const searchTracks = async (e) => {
    e.preventDefault();
    
    // Grab the token we saved during login
    const token = localStorage.getItem('spotifyAccessToken');
    
    if (!token) {
      alert('Please connect Spotify first using the button in the sidebar!');
      return;
    }

    if (!query) return;

    try {
      // Hit the official Spotify Search API
      const { data } = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          q: query,
          type: 'track',
          limit: 4 // Just grab the top 4 results to keep the UI clean
        }
      });
      
      setResults(data.tracks.items);
    } catch (error) {
      console.error('Error searching Spotify:', error);
      if (error.response?.status === 401) {
        alert('Your Spotify token expired. Please reconnect!');
      }
    }
  };

  return (
    <div style={{ marginBottom: '30px' }}>
      <form onSubmit={searchTracks} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a song or artist..." 
          style={{
            flexGrow: 1,
            padding: '12px 20px',
            borderRadius: '20px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            outline: 'none'
          }}
        />
        <button type="submit" style={{
          padding: '10px 20px',
          borderRadius: '20px',
          border: 'none',
          backgroundColor: '#8B5CF6',
          color: 'white',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          <i className="fa-solid fa-magnifying-glass"></i> Search
        </button>
      </form>

      {/* Render the Search Results */}
      {results.length > 0 && (
        <div style={{ 
          backgroundColor: 'rgba(0,0,0,0.4)', 
          borderRadius: '15px', 
          padding: '10px',
          border: '1px solid #333'
        }}>
          {results.map(track => (
            <div key={track.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px',
              borderBottom: '1px solid #222'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <img src={track.album.images[2]?.url} alt="album art" style={{ width: '40px', height: '40px', borderRadius: '4px' }} />
                <div>
                  <div style={{ fontWeight: 'bold', color: 'white' }}>{track.name}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>{track.artists[0].name}</div>
                </div>
              </div>
              <button style={{
                background: 'none',
                border: '1px solid #1db954',
                color: '#1db954',
                padding: '5px 15px',
                borderRadius: '15px',
                cursor: 'pointer',
                fontSize: '12px'
              }}>
                + Add to Queue
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpotifySearch;