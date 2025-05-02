import "./style.css";
import { Midi } from "@tonejs/midi";
import { YIN } from "pitchfinder";

// Configuration constants for YouTube player and Canvas
const YOUTUBE_VIDEO_ID = "tRFLs_-54gE"; // Taylor Swift - Love Story (Karaoke Version)
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 300;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 20;
const DRAWABLE_HEIGHT = CANVAS_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

// Note visualization constants
const NOTE_HEIGHT = 12;
const NOTE_COLOR = "rgba(66, 135, 245, 0.7)";
const NOTE_ACTIVE_COLOR = "rgba(255, 215, 0, 0.8)"; // Gold color for active notes
const NOW_LINE_COLOR = "rgba(255, 0, 0, 0.8)";
const NOW_LINE_WIDTH = 3;
const PIXELS_PER_SECOND = 100; // Horizontal scrolling speed
const NOW_LINE_POSITION = CANVAS_WIDTH / 4; // Position of the "now" line from the left
const AUDIO_LATENCY_MS = 300; // Adjustable latency compensation to sync notes with audio

// Audio processing constants
const FFT_SIZE = 2048; // Size of the FFT for the analyzer node
const PITCH_DETECTION_INTERVAL_MS = 50; // How often to run pitch detection (in milliseconds)

// MIDI note range for visualization
let minMidiNote = 55; // Default minimum note (G3)
let maxMidiNote = 79; // Default maximum note (G5)
let midiRange = maxMidiNote - minMidiNote;

// Game state
let gameState = "Ready"; // Ready, Playing, Paused, Finished
let parsedNotes = []; // Will store parsed MIDI note data
let youtubePlayer = null;
let animationFrameId = null;
let lastRenderTime = 0;

// Audio context and nodes
let audioContext = null;
let analyserNode = null;
let microphoneStream = null;
let pitchDetector = null;
let currentPitch = null;
let audioDataArray = null;
let sourceNode = null; // Added to store the source node for inspection

// Application initialization
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Vocal Stream initialized");

  // Load and parse MIDI data
  await loadMidiData();

  // Calculate the MIDI note range from the actual data
  calculateMidiNoteRange();

  // Set up canvas
  setupCanvas();

  // Set up YouTube Player API with timeout fallback
  setupYouTubeAPIWithFallback();

  // Set up event listeners
  setupEventListeners();

  // Initialize pitch detector
  initializePitchDetector();

  // Expose audio objects to window for Web Audio Inspector
  window.vocalStreamAudio = {
    getAudioContext: () => audioContext,
    getAnalyserNode: () => analyserNode,
    getSourceNode: () => sourceNode,
  };
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

// Function to calculate the MIDI note range for visualization
function calculateMidiNoteRange() {
  if (parsedNotes.length === 0) return;

  // Find the minimum and maximum MIDI note values
  minMidiNote = Math.min(...parsedNotes.map((note) => note.midi));
  maxMidiNote = Math.max(...parsedNotes.map((note) => note.midi));

  // Add a small buffer to the range
  minMidiNote = Math.max(0, minMidiNote - 2);
  maxMidiNote = Math.min(127, maxMidiNote + 2);

  midiRange = maxMidiNote - minMidiNote;

  console.log(
    `MIDI note range: ${minMidiNote} to ${maxMidiNote} (range: ${midiRange})`
  );
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

  // Draw initial background
  drawBackground(ctx);

  console.log("Canvas setup completed");
}

// Draw the canvas background
function drawBackground(ctx) {
  // Clear the canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw background
  ctx.fillStyle = "#282828";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw horizontal lines for octaves
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;

  // Draw octave lines based on MIDI notes (C notes)
  for (let midiNote = 60; midiNote <= maxMidiNote; midiNote += 12) {
    if (midiNote >= minMidiNote) {
      const y = midiToY(midiNote);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();

      // Label the note (C4, C5, etc.)
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "10px Arial";
      ctx.fillText(`C${Math.floor(midiNote / 12) - 1}`, 5, y - 5);
    }
  }

  // Draw the "now" line
  ctx.strokeStyle = NOW_LINE_COLOR;
  ctx.lineWidth = NOW_LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(NOW_LINE_POSITION, MARGIN_TOP);
  ctx.lineTo(NOW_LINE_POSITION, CANVAS_HEIGHT - MARGIN_BOTTOM);
  ctx.stroke();
}

// Convert MIDI note to Y coordinate on canvas
function midiToY(midiNote) {
  // Calculate the relative position within the MIDI range (0.0 to 1.0)
  const relativePitch = (midiNote - minMidiNote) / midiRange;

  // Invert the relative pitch for Y calculation (higher notes higher on canvas)
  const invertedRelativePitch = 1.0 - relativePitch;

  // Map to canvas drawable height
  return MARGIN_TOP + invertedRelativePitch * DRAWABLE_HEIGHT;
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
    stopGameLoop();
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

// Main game loop using requestAnimationFrame
function gameLoop(timestamp) {
  if (!lastRenderTime) lastRenderTime = timestamp;

  // Schedule the next frame
  animationFrameId = requestAnimationFrame(gameLoop);

  // Only update if we're in Playing state
  if (gameState !== "Playing") return;

  // Get the current playback time from YouTube player
  let currentTime = 0;
  try {
    if (youtubePlayer && youtubePlayer.getCurrentTime) {
      currentTime = youtubePlayer.getCurrentTime();
    }
  } catch (error) {
    console.warn("Error getting YouTube playback time:", error);
  }

  // Apply latency adjustment if needed
  // Use the override value if available, otherwise use the constant
  const latencyMs =
    window.AUDIO_LATENCY_MS_OVERRIDE !== undefined
      ? window.AUDIO_LATENCY_MS_OVERRIDE
      : AUDIO_LATENCY_MS;
  currentTime -= latencyMs / 1000;

  // Update the canvas
  renderNotes(currentTime);

  // Update pitch detection visualization
  if (currentPitch) {
    renderPitchIndicator(currentPitch);
  }
}

// Function to start the game loop
function startGameLoop() {
  if (!animationFrameId) {
    lastRenderTime = 0;
    animationFrameId = requestAnimationFrame(gameLoop);
    console.log("Game loop started");
  }
}

// Function to stop the game loop
function stopGameLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    console.log("Game loop stopped");
  }
}

// Render notes on the canvas
function renderNotes(currentTime) {
  const canvas = document.getElementById("note-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Draw background and grid
  drawBackground(ctx);

  // Calculate time window for visible notes
  const timeWindow = CANVAS_WIDTH / PIXELS_PER_SECOND;
  const startTime = currentTime - NOW_LINE_POSITION / PIXELS_PER_SECOND;
  const endTime = startTime + timeWindow;

  // Draw visible notes
  for (const note of parsedNotes) {
    // Check if note is visible in the current time window
    if (note.time + note.duration >= startTime && note.time <= endTime) {
      // Calculate position and dimensions of the note rectangle
      const x =
        NOW_LINE_POSITION + (note.time - currentTime) * PIXELS_PER_SECOND;
      const y = midiToY(note.midi) - NOTE_HEIGHT / 2; // Center note on the pitch
      const width = note.duration * PIXELS_PER_SECOND;

      // Check if this note is currently under the "now" line
      const isActive =
        note.time <= currentTime && note.time + note.duration >= currentTime;

      // Set appropriate color
      ctx.fillStyle = isActive ? NOTE_ACTIVE_COLOR : NOTE_COLOR;

      // Draw the note
      ctx.fillRect(x, y, width, NOTE_HEIGHT);

      // Add note name for debug/reference
      if (width > 30) {
        // Only add text if there's enough space
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.font = "10px Arial";
        ctx.fillText(note.name, x + 5, y + NOTE_HEIGHT - 2);
        ctx.fillStyle = isActive ? NOTE_ACTIVE_COLOR : NOTE_COLOR; // Reset fill style for next note
      }
    }
  }

  // Add a debug display of current time
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.fillText(`Time: ${currentTime.toFixed(2)}s`, 10, CANVAS_HEIGHT - 10);
}

// Function to render the pitch indicator
function renderPitchIndicator(pitch) {
  const canvas = document.getElementById("note-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Convert Hz to MIDI note number
  const midiNote = freqToMidi(pitch);

  // Check if the pitch is within our visualization range
  if (midiNote < minMidiNote || midiNote > maxMidiNote) {
    return; // Pitch is out of our displayable range
  }

  // Calculate Y position for the detected pitch
  const y = midiToY(midiNote);

  // Draw the pitch indicator at the NOW_LINE_POSITION
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.beginPath();
  ctx.arc(NOW_LINE_POSITION, y, 8, 0, Math.PI * 2);
  ctx.fill();

  // Add pitch info text
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.fillText(
    `Pitch: ${pitch.toFixed(1)} Hz (${midiToNoteName(midiNote)})`,
    NOW_LINE_POSITION + 15,
    y + 5
  );
}

// Convert frequency in Hz to MIDI note number
function freqToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440);
}

// Convert MIDI note number to note name
function midiToNoteName(midi) {
  const noteNames = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const octave = Math.floor(midi / 12) - 1;
  const noteName = noteNames[midi % 12];
  return `${noteName}${octave}`;
}

// Initialize the pitch detector
function initializePitchDetector() {
  // Create an instance of the YIN pitch detection algorithm with better threshold
  // Increasing threshold from default 0.1 to 0.2 reduces false positives
  pitchDetector = YIN({
    sampleRate: 44100,
    threshold: 0.2, // Higher threshold (0.1-0.3) means more selective detection
  });

  // Create an array to hold audio data for analysis
  audioDataArray = new Float32Array(FFT_SIZE);

  console.log("Pitch detector initialized with threshold 0.2");
}

// Request access to the microphone
async function requestMicrophoneAccess() {
  try {
    // Create audio context if it doesn't exist
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log(
        "Created AudioContext with sampleRate:",
        audioContext.sampleRate
      );
    }

    console.log("Requesting microphone access...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setupAudioProcessing(stream);
    return true;
  } catch (error) {
    console.error("Error accessing microphone:", error);
    showMicrophoneError(error);
    return false;
  }
}

// Set up the audio processing graph
function setupAudioProcessing(stream) {
  // Store the microphone stream for later cleanup
  microphoneStream = stream;

  // Create a source node from the microphone stream
  sourceNode = audioContext.createMediaStreamSource(stream);

  // Create an analyzer node for frequency analysis
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = FFT_SIZE;

  // Connect the source to the analyzer
  sourceNode.connect(analyserNode);

  // Add a silent gain node to keep the audio graph "active" for inspection
  // but with zero gain to prevent feedback
  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;
  analyserNode.connect(silentGain);
  silentGain.connect(audioContext.destination);

  // Log analyser node properties for verification of Step 4.2
  console.log("AnalyserNode properties:", {
    fftSize: analyserNode.fftSize,
    frequencyBinCount: analyserNode.frequencyBinCount,
    minDecibels: analyserNode.minDecibels,
    maxDecibels: analyserNode.maxDecibels,
    smoothingTimeConstant: analyserNode.smoothingTimeConstant,
    sampleRate: audioContext.sampleRate,
  });

  console.log("Audio processing graph set up");
  console.log("Audio graph debugging: audioContext ->", audioContext);
  console.log("Audio graph debugging: sourceNode ->", sourceNode);
  console.log("Audio graph debugging: analyserNode ->", analyserNode);
  console.log(
    "To inspect in Web Audio Inspector, try: window.vocalStreamAudio.getAudioContext()"
  );

  // Start the pitch detection loop
  startPitchDetection();
}

// Start the periodic pitch detection
function startPitchDetection() {
  if (!analyserNode || gameState !== "Playing") return;

  console.log("Starting pitch detection with YIN algorithm");

  // Keep track of detection statistics for debugging
  let detectionCount = 0;
  let successfulDetections = 0;

  // Function to process audio and detect pitch
  const detectPitch = () => {
    if (gameState !== "Playing" || !analyserNode) return;

    // Get time-domain audio data
    analyserNode.getFloatTimeDomainData(audioDataArray);

    // Check audio volume - reject extremely quiet signals
    const volumeLevel = calculateRMSVolume(audioDataArray);
    const isSilence = volumeLevel < 0.01; // Threshold for what's considered silence

    // Detect pitch using the YIN algorithm
    const rawPitch = isSilence ? null : pitchDetector(audioDataArray);

    // Apply reasonable range filtering (human voice typically 80-1100 Hz)
    // Musical pitch detection typically 50-2000 Hz
    const MINIMUM_FREQUENCY = 50; // Filter out very low frequencies
    const MAXIMUM_FREQUENCY = 2000; // Filter out very high frequencies

    const pitch =
      rawPitch && rawPitch >= MINIMUM_FREQUENCY && rawPitch <= MAXIMUM_FREQUENCY
        ? rawPitch
        : null;

    // Update detection statistics
    detectionCount++;
    if (pitch) {
      successfulDetections++;
    }

    // Log pitch detection (for verifying Step 4.3)
    if (detectionCount % 10 === 0) {
      // Only log every 10th detection to avoid flooding console
      if (isSilence) {
        console.log(`Silence detected (RMS: ${volumeLevel.toFixed(5)})`);
      } else if (
        rawPitch &&
        (rawPitch < MINIMUM_FREQUENCY || rawPitch > MAXIMUM_FREQUENCY)
      ) {
        console.log(
          `Filtered out unreasonable pitch: ${rawPitch.toFixed(
            1
          )} Hz (outside valid range)`
        );
      } else {
        console.log(
          pitch
            ? `Detected pitch: ${pitch.toFixed(1)} Hz (${midiToNoteName(
                freqToMidi(pitch)
              )})`
            : "No clear pitch detected (non-tonal sound)"
        );
      }

      // Log detection rate occasionally
      if (detectionCount % 100 === 0) {
        const detectionRate = (
          (successfulDetections / detectionCount) *
          100
        ).toFixed(1);
        console.log(
          `Pitch detection stats: ${successfulDetections}/${detectionCount} (${detectionRate}%)`
        );
        console.log(`Current volume level: ${volumeLevel.toFixed(5)}`);
      }
    }

    // Update the current pitch
    currentPitch = pitch;

    // Schedule the next detection
    setTimeout(detectPitch, PITCH_DETECTION_INTERVAL_MS);
  };

  // Start the detection loop
  detectPitch();
}

// Calculate RMS (Root Mean Square) volume from audio data
function calculateRMSVolume(audioData) {
  let sumOfSquares = 0;
  for (let i = 0; i < audioData.length; i++) {
    sumOfSquares += audioData[i] * audioData[i];
  }
  const rms = Math.sqrt(sumOfSquares / audioData.length);
  return rms;
}

// Show microphone access error
function showMicrophoneError(error) {
  console.error("Microphone access error:", error);

  // Display an error message to the user on the start screen (which is visible when this error occurs)
  const startScreen = document.getElementById("start-screen");
  if (startScreen) {
    // Remove any existing error message
    const existingError = document.querySelector(".mic-error-message");
    if (existingError) {
      existingError.remove();
    }

    const errorDiv = document.createElement("div");
    errorDiv.className = "mic-error-message";
    errorDiv.innerHTML = `
      <h3>Microphone Access Required</h3>
      <p>To play Vocal Stream, you need to allow microphone access.</p>
      <p>Error: ${error.message || "Permission denied"}</p>
      <button id="retry-mic-button" class="primary-button">Retry</button>
    `;

    // Add to the DOM
    startScreen.appendChild(errorDiv);

    // Add event listener for retry button
    const retryButton = document.getElementById("retry-mic-button");
    if (retryButton) {
      retryButton.addEventListener("click", async () => {
        errorDiv.remove();
        await requestMicrophoneAccess();
      });
    }
  }
}

// Clean up audio resources
function cleanupAudio() {
  if (microphoneStream) {
    // Stop all audio tracks
    microphoneStream.getTracks().forEach((track) => track.stop());
    microphoneStream = null;
  }

  if (audioContext && audioContext.state !== "closed") {
    audioContext
      .close()
      .catch((err) => console.error("Error closing audio context:", err));
  }

  analyserNode = null;
  currentPitch = null;

  console.log("Audio resources cleaned up");
}

// Function to set up event listeners
function setupEventListeners() {
  const startButton = document.getElementById("start-button");
  const pauseButton = document.getElementById("pause-button");
  const playAgainButton = document.getElementById("play-again-button");
  const latencySlider = document.getElementById("latency-slider");
  const latencyValue = document.getElementById("latency-value");

  const startScreen = document.getElementById("start-screen");
  const gameplayScreen = document.getElementById("gameplay-screen");
  const resultsScreen = document.getElementById("results-screen");

  // Setup latency slider
  if (latencySlider && latencyValue) {
    latencySlider.value = AUDIO_LATENCY_MS;
    latencyValue.textContent = AUDIO_LATENCY_MS;

    latencySlider.addEventListener("input", (event) => {
      const newLatency = parseInt(event.target.value);
      // Update the displayed value
      latencyValue.textContent = newLatency;
      // Update the global latency value used in the game loop
      window.AUDIO_LATENCY_MS_OVERRIDE = newLatency;
      console.log(`Latency adjusted to ${newLatency}ms`);
    });
  }

  if (startButton) {
    startButton.addEventListener("click", async () => {
      console.log("Start button clicked");

      // Request microphone access before starting the game
      const micAccessGranted = await requestMicrophoneAccess();

      if (!micAccessGranted) {
        console.error("Game cannot start without microphone access");
        return;
      }

      gameState = "Playing";

      // Show gameplay screen
      document.getElementById("start-screen").classList.remove("active");
      document.getElementById("gameplay-screen").classList.add("active");

      // Reset pause button text
      const pauseButton = document.getElementById("pause-button");
      if (pauseButton) {
        pauseButton.textContent = "Pause";
      }

      // Start the YouTube video if player is ready
      try {
        if (youtubePlayer && youtubePlayer.playVideo) {
          youtubePlayer.playVideo();
        }
      } catch (error) {
        console.error("Error starting YouTube playback:", error);
        // Continue with the game even if video playback fails
      }

      // Start the game loop for note visualization
      startGameLoop();

      // Start pitch detection
      startPitchDetection();
    });
  }

  if (pauseButton) {
    pauseButton.addEventListener("click", () => {
      console.log("Pause button clicked");
      try {
        if (gameState === "Playing") {
          gameState = "Paused";
          pauseButton.textContent = "Play";
          if (youtubePlayer && youtubePlayer.pauseVideo) {
            youtubePlayer.pauseVideo();
          }
        } else if (gameState === "Paused") {
          gameState = "Playing";
          pauseButton.textContent = "Pause";
          if (youtubePlayer && youtubePlayer.playVideo) {
            youtubePlayer.playVideo();
          }
          // Restart pitch detection if we're resuming
          startPitchDetection();
        }
      } catch (error) {
        console.error("Error toggling pause state:", error);
        // Toggle game state even if video control fails
        gameState = gameState === "Playing" ? "Paused" : "Playing";
        pauseButton.textContent = gameState === "Playing" ? "Pause" : "Play";
      }
    });
  }

  if (playAgainButton) {
    playAgainButton.addEventListener("click", () => {
      console.log("Play Again button clicked");
      gameState = "Ready";

      // Clean up audio resources
      cleanupAudio();

      // Hide Results Screen, show Start Screen
      document.getElementById("results-screen").classList.remove("active");
      document.getElementById("start-screen").classList.add("active");

      // Reset YouTube player if possible
      try {
        if (youtubePlayer && youtubePlayer.seekTo) {
          youtubePlayer.seekTo(0);
          youtubePlayer.pauseVideo();
        }
      } catch (error) {
        console.error("Error resetting YouTube player:", error);
      }
    });
  }
}

// Function to show results screen
function showResultsScreen() {
  // Cleanup audio resources
  cleanupAudio();

  // Hide gameplay screen
  document.getElementById("gameplay-screen").classList.remove("active");

  // Show results screen
  document.getElementById("results-screen").classList.add("active");

  // Update results content - for now just a placeholder
  const performanceSummary = document.getElementById("performance-summary");
  if (performanceSummary) {
    performanceSummary.innerHTML = `
      <p>Song completed!</p>
      <p>Pitch detection implementation successful.</p>
      <p>This version doesn't include scoring yet.</p>
    `;
  }

  console.log("Results screen shown");
}
