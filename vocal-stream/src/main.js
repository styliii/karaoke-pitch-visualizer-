import "./style.css";
import { Midi } from "@tonejs/midi";

// Configuration constants for YouTube player and Canvas
const YOUTUBE_VIDEO_ID = "tRFLs_-54gE"; // Taylor Swift - Love Story (Karaoke Version)
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 300;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 20;
const DRAWABLE_HEIGHT = CANVAS_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

// Game state
let gameState = "Ready"; // Ready, Playing, Paused, Finished
let parsedNotes = []; // Will store parsed MIDI note data
let youtubePlayer = null;

// Application initialization
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Vocal Stream initialized");

  // Load and parse MIDI data
  await loadMidiData();

  // Set up canvas
  setupCanvas();

  // Set up YouTube Player API with timeout fallback
  setupYouTubeAPIWithFallback();

  // Set up event listeners
  setupEventListeners();
});

// Function to load and parse MIDI data
async function loadMidiData() {
  try {
    const response = await fetch("/Love_Story_-_Taylor_Swift.mid");
    const arrayBuffer = await response.arrayBuffer();
    const midi = new Midi(arrayBuffer);

    // Assuming the vocal melody is in the first track with notes
    // Find first track with notes
    const vocalTrack = midi.tracks.find((track) => track.notes.length > 0);

    if (!vocalTrack) {
      throw new Error("No tracks with notes found in the MIDI file");
    }

    // Map the notes to our desired format
    parsedNotes = vocalTrack.notes.map((note) => ({
      time: note.time, // Start time in seconds
      duration: note.duration, // Duration in seconds
      midi: note.midi, // MIDI note number
      name: note.name, // Scientific notation (e.g., "C4")
      velocity: note.velocity, // Normalized velocity (0-1)
    }));

    console.log("MIDI data parsed successfully:", parsedNotes);
  } catch (error) {
    console.error("Error loading or parsing MIDI data:", error);
  }
}

// Function to set up canvas
function setupCanvas() {
  const canvas = document.getElementById("note-canvas");
  if (!canvas) {
    console.error("Canvas element not found");
    return;
  }

  // Set canvas dimensions
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // Get 2D rendering context
  const ctx = canvas.getContext("2d");

  // Draw a test rectangle to verify canvas is working
  ctx.fillStyle = "rgba(0, 150, 255, 0.5)";
  ctx.fillRect(50, 50, 200, 50);
  console.log("Canvas setup completed");
}

// Function to set up YouTube Player API with a fallback
function setupYouTubeAPIWithFallback() {
  // Show fallback immediately - remove later if YouTube loads
  const container = document.getElementById("youtube-player-container");
  if (container) {
    container.innerHTML = `
      <div class="youtube-fallback">
        <div class="fallback-message">
          <h3>Loading "Love Story" Karaoke...</h3>
          <p>If the video doesn't appear, you can continue with note visualization only.</p>
          <p>Or open the video in a new tab:</p>
          <a href="https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}" target="_blank" class="youtube-link">
            Open "Love Story" on YouTube
          </a>
        </div>
      </div>
    `;
  }

  // Set a shorter timeout to check if YouTube API loaded
  const youtubeTimeout = setTimeout(() => {
    console.warn("YouTube API failed to load in time, using fallback");
    setupYouTubeFallback(true); // true indicates this is a timeout fallback
  }, 3000); // 3 second timeout

  // Load YouTube IFrame Player API asynchronously
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  tag.onerror = () => {
    console.error("Failed to load YouTube API script");
    clearTimeout(youtubeTimeout);
    setupYouTubeFallback(true);
  };
  const firstScriptTag = document.getElementsByTagName("script")[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  // Function that will be called when YouTube API is ready
  window.onYouTubeIframeAPIReady = function () {
    clearTimeout(youtubeTimeout); // Clear the timeout since API loaded
    createYouTubePlayer();
  };
}

// Fallback for when YouTube API cannot be loaded
function setupYouTubeFallback(permanent = false) {
  // Only update UI if this is a permanent fallback
  if (permanent) {
    const container = document.getElementById("youtube-player-container");
    if (container) {
      container.innerHTML = `
        <div class="youtube-fallback">
          <div class="fallback-message">
            <h3>YouTube Player Not Available</h3>
            <p>We're unable to load the "Love Story" karaoke video at this time.</p>
            <p>You can still practice with the note visualization below.</p>
            <p>Or open the video in a new tab:</p>
            <a href="https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}" target="_blank" class="youtube-link">
              Open "Love Story" on YouTube
            </a>
          </div>
        </div>
      `;
    }
  }

  // Define a mock YouTube player that responds to the same methods
  // This allows the rest of the code to work without checking if youtubePlayer exists
  youtubePlayer = {
    // Mock methods
    playVideo: () => console.log("Mock player: playVideo called"),
    pauseVideo: () => console.log("Mock player: pauseVideo called"),
    seekTo: () => console.log("Mock player: seekTo called"),
    getPlayerState: () => -1, // Return a custom state
    getCurrentTime: () => 0, // Return 0 as current time
  };
}

// Create YouTube player with current video ID
function createYouTubePlayer() {
  // Clear previous player if it exists
  const container = document.getElementById("youtube-player-container");
  if (container) {
    container.innerHTML = "";
  }

  youtubePlayer = new YT.Player("youtube-player-container", {
    height: "360",
    width: "640",
    videoId: YOUTUBE_VIDEO_ID,
    playerVars: {
      autoplay: 0, // Don't autoplay until game starts
      controls: 1, // Show player controls for debugging
      disablekb: 0, // Enable keyboard controls for debugging
      fs: 0, // Disable fullscreen
      rel: 0, // Don't show related videos
      modestbranding: 1, // Minimal YouTube branding
      origin: window.location.origin, // Add origin for improved security and embedding compatibility
      enablejsapi: 1, // Enable JavaScript API
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError,
    },
  });
}

function onPlayerReady(event) {
  console.log("YouTube player ready");
}

function onPlayerStateChange(event) {
  // Handle player state changes (e.g., when video ends)
  if (event.data === YT.PlayerState.ENDED && gameState === "Playing") {
    gameState = "Finished";
    showResultsScreen();
  }
}

function onPlayerError(event) {
  console.error("YouTube player error:", event.data);

  // Display fallback message and controls
  const youtubeContainer = document.getElementById("youtube-player-container");
  if (youtubeContainer) {
    youtubeContainer.innerHTML = `
      <div class="youtube-error">
        <p>Unable to load the YouTube video.</p>
        <p>You can continue practicing with the note visualization.</p>
        <p>Error code: ${event.data}</p>
        <p>Try opening the video directly: <a href="https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}" target="_blank">YouTube Link</a></p>
      </div>
    `;
  }
}

// Function to set up event listeners
function setupEventListeners() {
  const startButton = document.getElementById("start-button");
  const pauseButton = document.getElementById("pause-button");
  const playAgainButton = document.getElementById("play-again-button");

  const startScreen = document.getElementById("start-screen");
  const gameplayScreen = document.getElementById("gameplay-screen");
  const resultsScreen = document.getElementById("results-screen");

  if (startButton) {
    startButton.addEventListener("click", () => {
      console.log("Start button clicked");
      gameState = "Playing";
      startScreen.classList.remove("active");
      gameplayScreen.classList.add("active");

      // Start the YouTube video if player is ready
      try {
        if (youtubePlayer && youtubePlayer.playVideo) {
          youtubePlayer.playVideo();
        }
      } catch (error) {
        console.error("Error starting YouTube playback:", error);
        // Continue with the game even if video playback fails
      }
    });
  }

  if (pauseButton) {
    pauseButton.addEventListener("click", () => {
      console.log("Pause button clicked");
      try {
        if (gameState === "Playing") {
          gameState = "Paused";
          if (youtubePlayer && youtubePlayer.pauseVideo) {
            youtubePlayer.pauseVideo();
          }
        } else if (gameState === "Paused") {
          gameState = "Playing";
          if (youtubePlayer && youtubePlayer.playVideo) {
            youtubePlayer.playVideo();
          }
        }
      } catch (error) {
        console.error("Error toggling pause state:", error);
        // Toggle game state even if video control fails
        gameState = gameState === "Playing" ? "Paused" : "Playing";
      }
    });
  }

  if (playAgainButton) {
    playAgainButton.addEventListener("click", () => {
      console.log("Play Again button clicked");
      gameState = "Ready";
      resultsScreen.classList.remove("active");
      startScreen.classList.add("active");

      // Reset the YouTube player if possible
      try {
        if (youtubePlayer && youtubePlayer.seekTo) {
          youtubePlayer.seekTo(0, true);
          youtubePlayer.pauseVideo();
        }
      } catch (error) {
        console.error("Error resetting YouTube player:", error);
        // Continue even if resetting the player fails
      }
    });
  }
}

// Function to show results screen
function showResultsScreen() {
  const gameplayScreen = document.getElementById("gameplay-screen");
  const resultsScreen = document.getElementById("results-screen");

  gameplayScreen.classList.remove("active");
  resultsScreen.classList.add("active");

  // For now, just display a simple completion message
  const performanceSummary = document.getElementById("performance-summary");
  if (performanceSummary) {
    performanceSummary.innerHTML = "<p>You've completed the song!</p>";
  }
}
