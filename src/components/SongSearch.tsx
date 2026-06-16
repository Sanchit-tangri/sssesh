import React, { useState } from "react";
import { Search, Plus, Music } from "lucide-react";
import { motion } from "motion/react";

const MOCK_SONGS = [
  { 
    title: "Midnight City", 
    artist: "M83", 
    url: "https://www.youtube.com/watch?v=dX3k_UAnyf4", 
    thumbnail: "https://i.ytimg.com/vi/dX3k_UAnyf4/hqdefault.jpg", 
    duration: 243 
  },
  { 
    title: "Starboy", 
    artist: "The Weeknd", 
    url: "https://www.youtube.com/watch?v=34Na4j8AVgA", 
    thumbnail: "https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg", 
    duration: 230 
  },
  { 
    title: "Blinding Lights", 
    artist: "The Weeknd", 
    url: "https://www.youtube.com/watch?v=4NRXx6U8ABQ", 
    thumbnail: "https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg", 
    duration: 200 
  }
];

export default function SongSearch({ onAdd }: { onAdd: (song: any) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>(MOCK_SONGS);
  const [isSearching, setIsSearching] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", query);
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Search failed");
      }
      const data = await res.json();
      console.log(`Found ${data.length} songs for query: ${query}`);
      setResults(data);
      if (data.length === 0) {
        setError("No embeddable YouTube videos found. Try a different term.");
      }
    } catch (err: any) {
      console.error("Search fetch error:", err);
      setError(err.message || "Could not connect to search service");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length === 0) {
      setResults(MOCK_SONGS);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search for any song (e.g. The Weeknd)..."
          className="w-full pl-10 pr-24 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 text-sm"
        />
        <button 
          type="submit"
          disabled={isSearching}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {isSearching ? "..." : "Search"}
        </button>
      </form>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {error && (
          <p className="text-center text-orange-500/80 py-4 text-xs font-mono bg-orange-500/5 rounded-xl border border-orange-500/10 mb-2">
            {error}
          </p>
        )}
        {results.map((song, i) => (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            key={song.title}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <img src={song.thumbnail} className="w-10 h-10 rounded-lg object-cover" alt="" />
              <div>
                <h4 className="text-sm font-bold">{song.title}</h4>
                <p className="text-xs text-white/50">{song.artist}</p>
              </div>
            </div>
            <button
              onClick={() => {
                console.log("Selected song to add:", song.title);
                onAdd(song);
              }}
              className="px-4 py-2 bg-orange-500/20 text-orange-500 rounded-lg transition-all hover:bg-orange-500 hover:text-white flex items-center gap-2 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </motion.div>
        ))}
        {query.length > 2 && results.length === 0 && (
          <p className="text-center text-white/30 py-4 text-sm">No songs found</p>
        )}
      </div>
    </div>
  );
}
