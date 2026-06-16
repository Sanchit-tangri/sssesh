// YouTube Data API v3 integration for song search

export async function searchSongs(query: string) {
  const apiKey = process.env.YOUTUBE_API_KEY || "";
  console.log("YouTube searching for tracks with query:", query);

  if (!apiKey) {
    console.error("YOUTUBE_API_KEY is missing in process.env!");
    throw new Error("YOUTUBE_API_KEY is not configured in your environment. Please add it to your .env file and restart the server.");
  }

  // maxResults=10, type=video, videoEmbeddable=true to ensure we only get playable content
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&videoEmbeddable=true&key=${apiKey}`;

  try {
    console.log("Fetching from YouTube Data API with query:", query);
    const res = await fetch(url);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`YouTube API Network Error: ${res.status} ${res.statusText}`, errorText);
      throw new Error(`YouTube API returned ${res.status}: ${errorText.substring(0, 100)}`);
    }

    const data = await res.json();
    console.log("YouTube API raw response keys:", Object.keys(data));

    if (data.error) {
      console.error("YouTube API Error Object:", JSON.stringify(data.error));
      throw new Error(`YouTube API Error: ${data.error.message}`);
    }

    if (!data.items) {
      console.error("YouTube API response missing 'items' key:", data);
      return [];
    }

    console.log(`YouTube API: Found ${data.items.length} items`);

    if (data.items.length > 0) {
      const songs = data.items.map((item: any) => ({
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        duration: 0,
        id: item.id.videoId
      }));
      console.log(`YouTube API: Successfully parsed ${songs.length} titles`);
      return songs;
    }

    return [];
  } catch (error: any) {
    console.error("YouTube search service failure:", error.message);
    throw error;
  }
}
