import React, { useEffect, useState } from "react";
import './App.css';
import { BounceLoader } from 'react-spinners';

const API_KEY = "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";
const SPOTIFY_CLIENT_ID = '4da133b557414e81bbf9d9d0a2721232';
const SPOTIFY_REDIRECT_URI = 'http://localhost:3000/';
const SPOTIFY_SCOPES = ['playlist-modify-private', 'playlist-read-private', 'user-read-private', 'playlist-modify-public', 'ugc-image-upload'];
const authorizationUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent(SPOTIFY_SCOPES.join(' '))}&response_type=token&show_dialog=true`;


function App() {

  const [artists, setArtists] = useState("");
  const [title, setTitle] = useState("");
  const [songs, setSongs] = useState("");
  const [cover, setCover] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSpotifyLogin = () => {
    window.location.href = authorizationUrl;
  };

  useEffect(() => {
    const handleRedirect = () => {
      const queryParams = new URLSearchParams(window.location.hash.substring(1));
      const token = queryParams.get('access_token');
      
      if (token) {
        setAccessToken(token);
        // Remove the access token from the URL fragment
      window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleRedirect();
  }, []);

  console.log(accessToken);
  // Generate the playlist using GPT-4 and DALLE-3 APIs
  async function generatePlaylist(){
      setIsLoading(true);
      console.log("Generating Playlist...");
    
      // Use user input to create prompt
      const APIBody1 = {
        "model": "gpt-4",
        "messages": [
          {
            "role": "user",
            "content": "Generate a playlist of 30 songs from these artists and other similar artists that fit a similar vibe: " + artists + ". Generate nothing else but the list."
          }
        ]
      }

      // Generate songs using GPT-4 and save them to songs variable
      const getSongs = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + API_KEY
        },
        body: JSON.stringify(APIBody1)
      })
      .then((data) => data.json())
      .then((data) => {
        setSongs((data.choices[0].message.content));
        console.log(songs);
        console.log(data);
        return data;
      });

      const songsResponse = getSongs.choices[0].message.content;

      // Use songs variable to create prompt
      const APIBody2 = {
        "model": "gpt-4",
        "messages": [
          {
            "role": "user",
            "content": "Generate a realistic and original 1 to 4 words album title inspired by " + artists + " containing the songs " + songsResponse + ", Generate nothing but the title, No quotes",
          }
        ]
      }

      // Generate title using GPT-4 and save to title variable
      const getTitle = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + API_KEY
        },
        body: JSON.stringify(APIBody2)
      })
      .then((data) => data.json())
      .then((data) => {
        setTitle((data.choices[0].message.content));
        console.log(title);
        console.log(data);
        return data;
      });

      const titleResponse = getTitle.choices[0].message.content;

      // Use title variable to create prompt
      const APIBody3 = {
        "model": "dall-e-3",
        "prompt": "An album cover, inspired by " + artists + ", titled " + titleResponse + ", full-screen art",
        "n": 1,
        "size": "1024x1024",
        "response_format": "b64_json"
      }

      // Generate image using DALLE-3 and save to cover variable
      await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + API_KEY
        },
        body: JSON.stringify(APIBody3)
      })
      .then((data) => data.json())
      .then((data) => {
        console.log(data);
        setCover(data.data[0].b64_json);
      });
  
      setIsLoading(false);

      var T = document.getElementById("coverDiv");
      T.style.display = "block";
      var S = document.getElementById("spotifyDiv");
      S.style.display = "block";
  }

  const createPlaylist = async (accessToken, userId, playlistName) => {
    const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: playlistName,
        public: false, // You can set this to true if you want the playlist to be public
      }),
    });

    const data = await response.json();
    return data.id;
  };

  const convertPNGtoJPEG = async (pngBase64, maxWidth, maxHeight) => {
    // Create an HTML canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
  
    // Create an Image object and set its source to the PNG base64 string
    const image = new Image();
    image.src = 'data:image/png;base64,' + pngBase64;
  
    // Wait for the image to load
    await new Promise((resolve) => {
      image.onload = resolve;
    });
  
    // Calculate the new dimensions while preserving the aspect ratio
    const aspectRatio = image.width / image.height;
    let newWidth = maxWidth;
    let newHeight = maxWidth / aspectRatio;
  
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = maxHeight * aspectRatio;
    }
  
    // Set the canvas dimensions to the new dimensions
    canvas.width = newWidth;
    canvas.height = newHeight;
  
    // Draw the resized PNG image onto the canvas
    ctx.drawImage(image, 0, 0, newWidth, newHeight);
  
    // Convert the canvas content to a JPEG base64 string
    const jpegBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
  
    return jpegBase64;
  };

  const addCover = async (accessToken, playlistId, imageUrl) => {
    const jpegBase64 = await convertPNGtoJPEG(imageUrl, 512, 512);
    console.log(jpegBase64);
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/images`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
        'Authorization': `Bearer ${accessToken}`,
      },
      body:
        (jpegBase64),
    });

    const data = await response.text();
    return data;
  };


  async function getUserId(accessToken){
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const data = await response.json();
    return data.id;
  }

  // Get track IDs
  async function getTrackIds() {
    console.log("Getting track IDs...");

    // Parse songs to extract individual song titles
    const songTitles = songs.split('\n');

    const trackIds = [];

    // Search for tracks for each song title
    for (const songTitle of songTitles) {
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(songTitle)}&type=track`;

        // Make a request to Spotify's search API
        const searchResponse = await fetch(searchUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        const searchData = await searchResponse.json();

        // Extract track IDs from the search results
        if (searchData && searchData.tracks && searchData.tracks.items.length > 0) {
            // Assume the first track in the search results is the desired one
            const trackId = searchData.tracks.items[0].id;
            trackIds.push(trackId);
        }
    }

    // Now you have an array of track IDs for the songs
    console.log("Track IDs:", trackIds);
    return trackIds;
}

  // Add tracks to playlist
  async function addTracksToPlaylist(accessToken, playlistId, trackIds) {
    const addTracksUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

    const response = await fetch(addTracksUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            uris: trackIds.map(trackId => `spotify:track:${trackId}`)
        })
    });

    const data = await response.json();
    return data;
}

  // Function to convert PNG base64 to JPEG base64

  async function createSpotify() {
    setIsLoading(true);

     // Get user ID
     const userId = await getUserId(accessToken);

     // Get track IDs of the songs
     const trackIds = await getTrackIds();

     // Create playlist and wait for it to complete
     const playlistId = await createPlaylist(accessToken, userId, title);

     // Add tracks to the playlist
     await addTracksToPlaylist(accessToken, playlistId, trackIds);
 
     // Add cover and wait for it to complete
     await addCover(accessToken, playlistId, cover);
 
     setIsLoading(false);
  }

  return (
    <div className="App">
      <header>
        <h1 className="logo">PlaylistAI</h1>
      </header>
      <main>
        {accessToken ? (
          <section>
            <textarea
              onChange={(e) => setArtists(e.target.value)}
              placeholder='Enter your favorite artists separated by commas'
              cols={50}
              rows={10}
            />
            <button onClick={generatePlaylist} disabled={isLoading}>
              {isLoading ? (
                <BounceLoader size={20} color="white" loading={isLoading}></BounceLoader>
              ) : (
                'Generate Playlist'
              )}
            </button>
            <h2>{title}</h2>
            <ul>
              {songs.split('\n').map((song, index) => <li key={index}>{song}</li>)}
            </ul>
            <div id="coverDiv" style={{ display: cover ? "block" : "none" }}>
              <img src={`data:image/png;base64, ${cover}`} alt={title} width="500px" height="500px" />
            </div>
            <div id="spotifyDiv" style={{ display: "none" }}>
              <button onClick={createSpotify} disabled={isLoading}>
                {isLoading ? (
                  <BounceLoader size={20} color="white" loading={isLoading}></BounceLoader>
                ) : (
                  'Add to Spotify'
                )}
              </button>
            </div>
          </section>
        ) : (
          <button onClick={handleSpotifyLogin} disabled={isLoading}>
            {isLoading ? (
              <BounceLoader size={20} color="white" loading={isLoading}></BounceLoader>
            ) : (
              'Login to Spotify'
            )}
          </button>
        )}
      </main>
    </div>
  );
}

export default App