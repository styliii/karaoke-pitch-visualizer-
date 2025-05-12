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
const NOTE_MATCH_COLOR = "rgba(0, 255, 0, 0.8)"; // Green color for matched notes
const NOTE_MISS_HIGH_COLOR = "rgba(255, 165, 0, 0.8)"; // Orange for too high
const NOTE_MISS_LOW_COLOR = "rgba(255, 80, 80, 0.8)"; // Red for too low
const NOTE_NO_INPUT_COLOR = "rgba(150, 150, 150, 0.8)"; // Gray for no input
const NOW_LINE_COLOR = "rgba(255, 0, 0, 0.8)";
const NOW_LINE_WIDTH = 3;
const PIXELS_PER_SECOND = 100; // Horizontal scrolling speed
const NOW_LINE_POSITION = CANVAS_WIDTH / 4; // Position of the "now" line from the left
const AUDIO_LATENCY_MS = 300; // Adjustable latency compensation to sync notes with audio
const PITCH_MATCH_THRESHOLD = 1.5; // How close in semitones to consider a match

// Octave adjustment to fix MIDI data interpretation
let octaveOffset = -1; // Default -1 for one octave down (12 MIDI notes)

// Pitch accuracy constants (for Step 5.2)
const PITCH_TOLERANCE_CENTS = 50; // How many cents of error allowed for a perfect match (100 cents = 1 semitone)
const PITCH_TOLERANCE_SEMITONES = PITCH_TOLERANCE_CENTS / 100; // Convert cents to semitones

// Audio processing constants
const FFT_SIZE = 2048; // Size of the FFT for the analyzer node
const PITCH_DETECTION_INTERVAL_MS = 50; // How often to run pitch detection (in milliseconds)
const SILENCE_THRESHOLD = 0.0001; // Even lower threshold for silence detection
const PITCH_DISPLAY_DURATION_MS = 500; // Longer display time for the pitch indicator

// Add range clamping to ensure detected pitches are always visible
const MIN_DISPLAYED_MIDI = 48; // C3
const MAX_DISPLAYED_MIDI = 84; // C6

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

// Constants for pitch visualization
const PITCH_INDICATOR_COLOR = "rgba(255, 255, 255, 1.0)"; // Full opacity
const PITCH_INDICATOR_WIDTH = 60; // Wider
const PITCH_INDICATOR_HEIGHT = 4; // Thicker

// Add variables for pitch smoothing
let lastValidPitchTime = 0;
let smoothedPitch = null;

// Additional tracking variables
let accuracyResult = null; // Will store the current accuracy comparison result
let currentActiveNote = null; // Will store the currently active note at the now line

// Audio reference tone for testing
let referenceOscillator = null;
let referenceGain = null;

// Add data structure to track note feedback
const noteFeedback = new Map(); // Map of note IDs to their feedback state
// Keep a permanent record of all feedback for results screen
const permanentFeedbackRecord = new Map();

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

  // Find the minimum and maximum MIDI note values from the original MIDI data
  const originalMinMidi = Math.min(...parsedNotes.map((note) => note.midi));
  const originalMaxMidi = Math.max(...parsedNotes.map((note) => note.midi));

  // Add a small buffer to the range
  const bufferedMinMidi = Math.max(0, originalMinMidi - 2);
  const bufferedMaxMidi = Math.min(127, originalMaxMidi + 2);

  // Update the global min/max values with octave adjustment
  function updateRangeWithOctaveOffset() {
    // Apply the octave offset (12 MIDI notes = 1 octave)
    minMidiNote = Math.max(0, bufferedMinMidi + octaveOffset * 12);
    maxMidiNote = Math.min(127, bufferedMaxMidi + octaveOffset * 12);
    midiRange = maxMidiNote - minMidiNote;

    console.log(
      `MIDI note range adjusted: ${minMidiNote} to ${maxMidiNote} (range: ${midiRange}) with octave offset: ${octaveOffset}`
    );
  }

  // Initial calculation
  updateRangeWithOctaveOffset();

  // Expose function to allow recalculation when octave changes
  window.updateMidiRangeWithOctave = updateRangeWithOctaveOffset;
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

  // Draw horizontal lines for octaves and semitones
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;

  // Draw semitone lines (more faint)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  for (let midiNote = minMidiNote; midiNote <= maxMidiNote; midiNote++) {
    const y = midiToY(midiNote);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }

  // Draw octave lines (C notes) with stronger color
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  for (let midiNote = 60; midiNote <= maxMidiNote; midiNote += 12) {
    if (midiNote >= minMidiNote) {
      const y = midiToY(midiNote);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();

      // Label the note (C4, C5, etc.)
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "bold 12px Arial";
      ctx.fillText(`C${Math.floor(midiNote / 12) - 1}`, 5, y - 5);
    }
  }

  // Draw pitch range indicators at min and max midi notes
  ctx.fillStyle = "rgba(255, 100, 100, 0.4)";
  const minY = midiToY(minMidiNote);
  ctx.fillRect(0, minY - 2, CANVAS_WIDTH, 4);

  ctx.fillStyle = "rgba(100, 255, 100, 0.4)";
  const maxY = midiToY(maxMidiNote);
  ctx.fillRect(0, maxY - 2, CANVAS_WIDTH, 4);

  // Draw the "now" line
  ctx.strokeStyle = NOW_LINE_COLOR;
  ctx.lineWidth = NOW_LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(NOW_LINE_POSITION, MARGIN_TOP);
  ctx.lineTo(NOW_LINE_POSITION, CANVAS_HEIGHT - MARGIN_BOTTOM);
  ctx.stroke();
}

// Convert MIDI note to Y coordinate on canvas, ensuring it's always visible
function midiToY(midiNote) {
  // Clamp MIDI note to visible range
  const clampedMidi = Math.max(minMidiNote, Math.min(maxMidiNote, midiNote));

  // Calculate the relative position within the MIDI range (0.0 to 1.0)
  const relativePitch = (clampedMidi - minMidiNote) / midiRange;

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
  // Handle player state changes
  const stateNames = {
    "-1": "unstarted",
    0: "ended",
    1: "playing",
    2: "paused",
    3: "buffering",
    5: "video cued",
  };

  const stateName = stateNames[event.data] || `unknown (${event.data})`;
  console.log(`YouTube player state changed to: ${stateName}`);

  // When video ends: transition to Finished state
  if (event.data === YT.PlayerState.ENDED && gameState === "Playing") {
    console.log("Video playback ended. Transitioning to Finished state.");
    gameState = "Finished";

    // Stop animation frame loop
    stopGameLoop();

    // Clean up audio processing
    cleanupAudio();

    // Show results screen
    showResultsScreen();
  }

  // Add a backup detection for end of song
  // Video duration is sometimes slightly different than MIDI duration
  if (event.data === YT.PlayerState.PLAYING && gameState === "Playing") {
    // Check if we have the duration
    try {
      const duration = youtubePlayer.getDuration();
      if (duration > 0) {
        // Schedule a check when we're close to the end
        const timeUntilEnd = (duration - 1) * 1000; // 1 second before end
        console.log(
          `Scheduling end-of-song check in ${timeUntilEnd.toFixed(0)}ms`
        );

        // Clear any existing timeout
        if (window.endOfSongTimeout) {
          clearTimeout(window.endOfSongTimeout);
        }

        // Set a new timeout
        window.endOfSongTimeout = setTimeout(() => {
          // Only proceed if we're still playing
          if (gameState === "Playing") {
            try {
              const currentTime = youtubePlayer.getCurrentTime();
              // If we're within 0.5 seconds of the end, consider it complete
              if (duration - currentTime <= 0.5) {
                console.log(
                  "End of song detected by timeout. Transitioning to Finished state."
                );
                gameState = "Finished";
                stopGameLoop();
                cleanupAudio();
                showResultsScreen();
              }
            } catch (error) {
              console.warn("Error checking end of song:", error);
            }
          }
        }, timeUntilEnd);
      }
    } catch (error) {
      console.warn("Error setting up end-of-song detection:", error);
    }
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

  // Track if current pitch matches any active note
  let pitchMatchesActiveNote = false;
  let activeNoteInfo = null;

  // Reset current active note for this frame
  currentActiveNote = null;

  // Get current volume level for display
  let currentVolumeLevel = 0;
  if (audioDataArray) {
    currentVolumeLevel = calculateRMSVolume(audioDataArray);
  }

  // Calculate the current MIDI note from pitch if available
  let currentMidiNote = null;
  if (currentPitch !== null) {
    currentMidiNote = freqToMidi(currentPitch);
  }

  // Draw visible notes
  for (const note of parsedNotes) {
    // Create a unique identifier for this note
    const noteId = `${note.time.toFixed(2)}_${note.midi}`;

    // Apply octave offset to the note (12 MIDI notes = 1 octave)
    const adjustedNote = {
      ...note,
      midi: note.midi + octaveOffset * 12,
      name: midiToNoteName(note.midi + octaveOffset * 12),
      id: noteId,
    };

    // Check if note is visible in the current time window
    if (
      adjustedNote.time + adjustedNote.duration >= startTime &&
      adjustedNote.time <= endTime
    ) {
      // Calculate position and dimensions of the note rectangle
      const x =
        NOW_LINE_POSITION +
        (adjustedNote.time - currentTime) * PIXELS_PER_SECOND;
      const y = midiToY(adjustedNote.midi) - NOTE_HEIGHT / 2; // Center note on the pitch
      const width = adjustedNote.duration * PIXELS_PER_SECOND;

      // Check if this note is currently under the "now" line
      const isActive =
        adjustedNote.time <= currentTime &&
        adjustedNote.time + adjustedNote.duration >= currentTime;

      // If this note is no longer active but has been active before, mark for cleanup
      if (
        !isActive &&
        adjustedNote.time + adjustedNote.duration < currentTime
      ) {
        // We've completely passed this note, add to permanent record if it has feedback
        if (noteFeedback.has(noteId)) {
          // Store in permanent record for results screen
          permanentFeedbackRecord.set(noteId, noteFeedback.get(noteId));
          // Remove from active feedback map
          noteFeedback.delete(noteId);
        }
      }

      // If this note is active, store it for accuracy comparison
      if (isActive) {
        currentActiveNote = { ...adjustedNote };
      }

      // Check if player's pitch matches this active note
      let isMatched = false;
      let midiDifference = null;
      let centDifference = null;
      let currentAccuracyResult = null;

      if (isActive && currentMidiNote !== null) {
        midiDifference = currentMidiNote - adjustedNote.midi;
        centDifference = semitonesToCents(midiDifference);
        isMatched = Math.abs(midiDifference) <= PITCH_TOLERANCE_SEMITONES;

        if (isMatched) {
          pitchMatchesActiveNote = true;
          activeNoteInfo = {
            name: adjustedNote.name,
            midi: adjustedNote.midi,
            difference: midiDifference.toFixed(2),
            cents: centDifference.toFixed(0),
          };
        }

        // Calculate accuracy result for this active note
        currentAccuracyResult = getAccuracyResult(centDifference, true);

        // Store feedback for this note
        const feedbackData = {
          result: currentAccuracyResult,
          time: Date.now(),
        };

        noteFeedback.set(noteId, feedbackData);
        // Also update permanent record right away
        permanentFeedbackRecord.set(noteId, feedbackData);

        // Set the global accuracy result
        accuracyResult = currentAccuracyResult;

        // Log the comparison result to the console (for Step 5.2 testing)
        if (Math.random() < 0.05) {
          // Only log occasionally to avoid console spam
          console.log(
            `Accuracy: ${accuracyResult}, Difference: ${centDifference.toFixed(
              0
            )} cents, Target: ${adjustedNote.name}, Current: ${midiToNoteName(
              Math.round(currentMidiNote)
            )}`
          );
        }
      } else if (isActive && currentMidiNote === null) {
        // No input while note is active
        currentAccuracyResult = "no-input";

        // Store feedback for this note
        const feedbackData = {
          result: currentAccuracyResult,
          time: Date.now(),
        };

        noteFeedback.set(noteId, feedbackData);
        // Also update permanent record right away
        permanentFeedbackRecord.set(noteId, feedbackData);
      }

      // Get the recorded feedback for this note
      const feedback = noteFeedback.get(noteId);

      // Set appropriate color based on feedback
      if (feedback) {
        switch (feedback.result) {
          case "match":
            ctx.fillStyle = NOTE_MATCH_COLOR; // Green for match
            break;
          case "miss-high":
            ctx.fillStyle = NOTE_MISS_HIGH_COLOR; // Orange for too high
            break;
          case "miss-low":
            ctx.fillStyle = NOTE_MISS_LOW_COLOR; // Red for too low
            break;
          case "no-input":
            ctx.fillStyle = NOTE_NO_INPUT_COLOR; // Gray for no input
            break;
          default:
            // If no specific feedback yet, use default active color
            ctx.fillStyle = isActive ? NOTE_ACTIVE_COLOR : NOTE_COLOR;
        }
      } else {
        // If no feedback stored yet, use default colors
        ctx.fillStyle = isActive ? NOTE_ACTIVE_COLOR : NOTE_COLOR;
      }

      // Draw the note
      ctx.fillRect(x, y, width, NOTE_HEIGHT);

      // Add note name for debug/reference
      if (width > 30) {
        // Only add text if there's enough space
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.font = "10px Arial";
        ctx.fillText(adjustedNote.name, x + 5, y + NOTE_HEIGHT - 2);

        // Reset fill style based on feedback for next note
        if (feedback) {
          switch (feedback.result) {
            case "match":
              ctx.fillStyle = NOTE_MATCH_COLOR;
              break;
            case "miss-high":
              ctx.fillStyle = NOTE_MISS_HIGH_COLOR;
              break;
            case "miss-low":
              ctx.fillStyle = NOTE_MISS_LOW_COLOR;
              break;
            case "no-input":
              ctx.fillStyle = NOTE_NO_INPUT_COLOR;
              break;
            default:
              ctx.fillStyle = isActive ? NOTE_ACTIVE_COLOR : NOTE_COLOR;
          }
        } else {
          ctx.fillStyle = isActive ? NOTE_ACTIVE_COLOR : NOTE_COLOR;
        }
      }
    }
  }

  // If no active note but we have pitch, set accuracy to "no-target"
  if (!currentActiveNote && currentPitch !== null) {
    accuracyResult = "no-target";
    if (Math.random() < 0.05) {
      // Log occasionally
      console.log(
        `Accuracy: ${accuracyResult}, No active note to compare against`
      );
    }
  }
  // If no pitch detected and we have an active note, set to "no-input"
  else if (currentActiveNote && currentPitch === null) {
    accuracyResult = "no-input";
    if (Math.random() < 0.05) {
      // Log occasionally
      console.log(
        `Accuracy: ${accuracyResult}, Target: ${currentActiveNote.name}`
      );
    }
  }
  // If neither pitch nor active note, no comparison possible
  else if (!currentActiveNote && currentPitch === null) {
    accuracyResult = null;
  }

  // Draw volume indicator to help with microphone troubleshooting
  const volumeWidth = 100;
  const volumeHeight = 10;
  const volumeX = 10;
  const volumeY = CANVAS_HEIGHT - 30;

  // Draw volume background
  ctx.fillStyle = "rgba(50, 50, 50, 0.5)";
  ctx.fillRect(volumeX, volumeY, volumeWidth, volumeHeight);

  // Draw volume level (show even extremely low values)
  const normalizedVolume = Math.min(1.0, currentVolumeLevel * 1000); // Scale up by 1000 for visibility
  ctx.fillStyle =
    normalizedVolume < SILENCE_THRESHOLD * 1000
      ? "rgba(255, 0, 0, 0.8)"
      : "rgba(0, 255, 0, 0.8)";
  ctx.fillRect(volumeX, volumeY, volumeWidth * normalizedVolume, volumeHeight);

  // Label
  ctx.fillStyle = "white";
  ctx.font = "10px Arial";
  ctx.fillText(
    `Volume: ${currentVolumeLevel.toFixed(4)}`,
    volumeX,
    volumeY - 5
  );

  // Add reference tone button for active notes
  if (currentActiveNote) {
    const btnX = CANVAS_WIDTH - 180;
    const btnY = 40;
    const btnWidth = 160;
    const btnHeight = 30;

    // Draw button background
    ctx.fillStyle = "rgba(0, 100, 200, 0.8)";
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

    // Draw button text
    ctx.fillStyle = "white";
    ctx.font = "bold 12px Arial";
    ctx.fillText(
      `Play Target Note: ${currentActiveNote.name}`,
      btnX + 10,
      btnY + 20
    );

    // Check for mouse click on the button (add event listener for this in setupEventListeners)
    canvas.dataset.referenceNoteMidi = currentActiveNote.midi;
    canvas.dataset.referenceNoteName = currentActiveNote.name;
  }

  // Draw calibration panel
  const panelX = CANVAS_WIDTH - 200;
  const panelY = 80;
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(panelX, panelY, 190, 100);

  // Panel title
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = "bold 12px Arial";
  ctx.fillText("Pitch Calibration", panelX + 10, panelY + 15);

  // Draw current frequency
  if (currentPitch !== null) {
    ctx.font = "12px Arial";
    const roundedMidi = Math.round(currentMidiNote);
    const expectedFreq = midiToFreq(roundedMidi);
    const yourFreq = currentPitch;
    const centsDiff = 1200 * Math.log2(yourFreq / expectedFreq);

    ctx.fillText(
      `Your note: ${midiToNoteName(roundedMidi)}`,
      panelX + 10,
      panelY + 35
    );
    ctx.fillText(
      `Expected: ${expectedFreq.toFixed(1)} Hz`,
      panelX + 10,
      panelY + 55
    );
    ctx.fillText(
      `Your freq: ${yourFreq.toFixed(1)} Hz`,
      panelX + 10,
      panelY + 75
    );
    ctx.fillText(
      `Diff: ${centsDiff.toFixed(0)} cents`,
      panelX + 10,
      panelY + 95
    );
  } else {
    ctx.fillText("No pitch detected", panelX + 10, panelY + 50);
  }

  // Draw the current pitch indicator if we have a valid detected pitch
  if (currentPitch !== null) {
    // Convert frequency to MIDI note number
    const midiNote = freqToMidi(currentPitch);

    // Convert MIDI note to Y position on canvas (will be clamped by midiToY function)
    const pitchY = midiToY(midiNote);

    // Calculate opacity based on time since last valid pitch
    const timeSinceLastPitch = Date.now() - lastValidPitchTime;
    // Full opacity until PITCH_DISPLAY_DURATION_MS/2, then fade out
    const opacity =
      timeSinceLastPitch < PITCH_DISPLAY_DURATION_MS / 2
        ? 1.0
        : Math.max(
            0,
            1.0 -
              (timeSinceLastPitch - PITCH_DISPLAY_DURATION_MS / 2) /
                (PITCH_DISPLAY_DURATION_MS / 2)
          );

    // Log visualization values for debugging (occasionally)
    if (Math.random() < 0.05) {
      // Log approximately 5% of frames
      console.log(
        `Drawing pitch indicator: ${currentPitch.toFixed(
          1
        )} Hz, MIDI: ${midiNote.toFixed(1)}, Y: ${pitchY.toFixed(
          1
        )}, Opacity: ${opacity.toFixed(
          2
        )}, Raw MIDI range: ${minMidiNote}-${maxMidiNote}`
      );
    }

    // Use color based on accuracy result (for Step 5.2 visual feedback)
    let indicatorColor = "rgb(255, 255, 255)"; // Default white

    if (accuracyResult === "match") {
      indicatorColor = "rgb(0, 255, 0)"; // Green for match
    } else if (accuracyResult === "miss-high") {
      indicatorColor = "rgb(255, 165, 0)"; // Orange for too high
    } else if (accuracyResult === "miss-low") {
      indicatorColor = "rgb(255, 80, 80)"; // Light red for too low
    }

    // Draw a horizontal line at the detected pitch position aligned with the now line
    ctx.fillStyle = `rgba(${indicatorColor
      .match(/\d+/g)
      .join(", ")}, ${opacity})`;

    // Draw the pitch indicator at the now line position
    ctx.fillRect(
      NOW_LINE_POSITION - PITCH_INDICATOR_WIDTH / 2,
      pitchY - PITCH_INDICATOR_HEIGHT / 2,
      PITCH_INDICATOR_WIDTH,
      PITCH_INDICATOR_HEIGHT
    );

    // Add a more visible text label with same opacity
    ctx.fillStyle = `rgba(${indicatorColor
      .match(/\d+/g)
      .join(", ")}, ${opacity})`;
    ctx.font = "bold 14px Arial";

    // Add match information to the display if matching
    let noteText = `${midiToNoteName(
      Math.round(midiNote)
    )} (${currentPitch.toFixed(1)} Hz)`;

    // Add accuracy result text
    if (accuracyResult === "match" && activeNoteInfo) {
      noteText += ` ✓ Perfect! (${activeNoteInfo.cents} cents)`;
    } else if (accuracyResult === "miss-high" && currentActiveNote) {
      noteText += ` ↓ Too High! Sing Lower`;
    } else if (accuracyResult === "miss-low" && currentActiveNote) {
      noteText += ` ↑ Too Low! Sing Higher`;
    } else if (accuracyResult === "no-target") {
      noteText += " (No target note)";
    }

    ctx.fillText(noteText, NOW_LINE_POSITION + 10, pitchY - 5);
  } else {
    // Even when no current pitch is detected, show the last position with fading
    if (smoothedPitch !== null) {
      const midiNote = freqToMidi(smoothedPitch);
      const pitchY = midiToY(midiNote);
      const timeSinceLastPitch = Date.now() - lastValidPitchTime;

      // Only show if within the fade time window
      if (timeSinceLastPitch < PITCH_DISPLAY_DURATION_MS) {
        const fadeOpacity = Math.max(
          0,
          0.7 - timeSinceLastPitch / PITCH_DISPLAY_DURATION_MS
        );

        ctx.fillStyle = `rgba(200, 200, 200, ${fadeOpacity})`;
        ctx.fillRect(
          NOW_LINE_POSITION - PITCH_INDICATOR_WIDTH / 2,
          pitchY - PITCH_INDICATOR_HEIGHT / 2,
          PITCH_INDICATOR_WIDTH,
          PITCH_INDICATOR_HEIGHT
        );
      }
    }

    // Log when no pitch is detected (occasionally)
    if (Math.random() < 0.05) {
      // Log approximately 5% of frames
      console.log("No pitch detected to visualize");
    }
  }

  // Display the accuracy result
  if (accuracyResult && currentActiveNote) {
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText(`Accuracy: ${accuracyResult}`, CANVAS_WIDTH - 150, 20);
  }

  // Add a debug display of current time and range
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.fillText(
    `Time: ${currentTime.toFixed(
      2
    )}s | MIDI Range: ${minMidiNote} to ${maxMidiNote}`,
    10,
    CANVAS_HEIGHT - 10
  );
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
    } else if (audioContext.state === "suspended") {
      // Resume if suspended
      console.log("Resuming existing audio context");
      await audioContext.resume();
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
    const isSilence = volumeLevel < SILENCE_THRESHOLD; // Using the new lower threshold constant

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
      lastValidPitchTime = Date.now();

      // Simple pitch smoothing
      if (smoothedPitch === null) {
        // First valid pitch, use as is
        smoothedPitch = pitch;
      } else {
        // Smooth with previous value (80% previous, 20% new)
        smoothedPitch = smoothedPitch * 0.8 + pitch * 0.2;
      }
    } else if (Date.now() - lastValidPitchTime > PITCH_DISPLAY_DURATION_MS) {
      // Only clear smoothed pitch after the display duration
      smoothedPitch = null;
    }

    // Log pitch detection more frequently for debugging
    if (detectionCount % 10 === 0) {
      // Log volume level to help with troubleshooting
      console.log(
        `Volume level: ${volumeLevel.toFixed(4)}, Silence: ${isSilence}`
      );

      // Only log actual pitch detections when not silent
      if (!isSilence) {
        console.log(
          `Raw pitch: ${
            rawPitch ? rawPitch.toFixed(1) : "null"
          } Hz, Filtered pitch: ${pitch ? pitch.toFixed(1) : "null"} Hz`
        );

        if (pitch) {
          const midiNote = freqToMidi(pitch);
          console.log(
            `Detected pitch: ${pitch.toFixed(1)} Hz (${midiToNoteName(
              midiNote
            )}), MIDI: ${midiNote.toFixed(
              1
            )}, Smoothed: ${smoothedPitch.toFixed(1)} Hz`
          );
        }
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
      }
    }

    // Update the current pitch with the smoothed value
    currentPitch = smoothedPitch;

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

  if (analyserNode) {
    analyserNode = null;
  }

  // Note: We don't completely close audioContext anymore to prevent issues with reuse
  // Instead we just suspend it
  if (audioContext && audioContext.state !== "closed") {
    try {
      audioContext
        .suspend()
        .catch((err) => console.error("Error suspending audio context:", err));
    } catch (err) {
      console.error("Error in audio context cleanup:", err);
    }
  }

  currentPitch = null;
  smoothedPitch = null;

  console.log("Audio resources cleaned up");
}

// Function to set up event listeners
function setupEventListeners() {
  const startButton = document.getElementById("start-button");
  const pauseButton = document.getElementById("pause-button");
  const playAgainButton = document.getElementById("play-again-button");
  const latencySlider = document.getElementById("latency-slider");
  const latencyValue = document.getElementById("latency-value");
  const canvas = document.getElementById("note-canvas");

  const startScreen = document.getElementById("start-screen");
  const gameplayScreen = document.getElementById("gameplay-screen");
  const resultsScreen = document.getElementById("results-screen");

  // Add octave adjustment controls to the gameplay screen
  const gameControls = document.getElementById("game-controls");
  if (gameControls) {
    const octaveControlDiv = document.createElement("div");
    octaveControlDiv.className = "octave-control";
    octaveControlDiv.innerHTML = `
      <label for="octave-selector">Octave Adjustment:</label>
      <select id="octave-selector">
        <option value="-2">-2 Octaves</option>
        <option value="-1" selected>-1 Octave</option>
        <option value="0">No Adjustment</option>
        <option value="1">+1 Octave</option>
        <option value="2">+2 Octaves</option>
      </select>
    `;
    gameControls.appendChild(octaveControlDiv);

    // Add event listener for the octave selector
    const octaveSelector = document.getElementById("octave-selector");
    if (octaveSelector) {
      octaveSelector.addEventListener("change", (event) => {
        octaveOffset = parseInt(event.target.value);
        console.log(`Octave adjustment set to ${octaveOffset}`);

        // Update the MIDI range based on the new octave offset
        if (window.updateMidiRangeWithOctave) {
          window.updateMidiRangeWithOctave();
        }
      });
    }
  }

  // Add canvas click handler for reference tone button
  if (canvas) {
    canvas.addEventListener("click", (event) => {
      // Only process clicks during gameplay
      if (gameState !== "Playing" && gameState !== "Paused") return;

      // Get canvas bounds
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Check if click is on the reference tone button
      const btnX = CANVAS_WIDTH - 180;
      const btnY = 40;
      const btnWidth = 160;
      const btnHeight = 30;

      if (
        x >= btnX &&
        x <= btnX + btnWidth &&
        y >= btnY &&
        y <= btnY + btnHeight
      ) {
        // Get the MIDI note from dataset
        const midiNote = parseInt(canvas.dataset.referenceNoteMidi);
        if (!isNaN(midiNote)) {
          console.log(
            `Playing reference tone for ${canvas.dataset.referenceNoteName}`
          );
          playReferenceTone(midiNote);
        }
      }
    });
  }

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

      // Force reset the audio context if it exists and is in a bad state
      if (
        audioContext &&
        (audioContext.state === "closed" || audioContext.state === "suspended")
      ) {
        try {
          console.log(
            `Audio context in ${audioContext.state} state, attempting to resume...`
          );

          if (audioContext.state === "suspended") {
            await audioContext.resume();
          } else {
            // If closed, we need to create a new one
            audioContext = null;
          }
        } catch (error) {
          console.error("Error resuming audio context:", error);
          // Force a new audio context creation
          audioContext = null;
        }
      }

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

      // Reset game state
      gameState = "Ready";

      // Clean up audio resources but don't fully close the audio context
      cleanupAudio();

      // Reset feedback data for a fresh start
      noteFeedback.clear();
      permanentFeedbackRecord.clear();

      // Reset any active timeouts
      if (window.endOfSongTimeout) {
        clearTimeout(window.endOfSongTimeout);
        window.endOfSongTimeout = null;
      }

      // Reset pitch tracking variables
      currentPitch = null;
      smoothedPitch = null;
      lastValidPitchTime = 0;
      accuracyResult = null;
      currentActiveNote = null;

      // Hide Results Screen, show Start Screen
      document.getElementById("results-screen").classList.remove("active");
      document.getElementById("start-screen").classList.add("active");

      // Reset YouTube player if possible
      try {
        if (youtubePlayer) {
          // Seek to beginning
          if (youtubePlayer.seekTo) {
            youtubePlayer.seekTo(0);
          }

          // Pause video
          if (youtubePlayer.pauseVideo) {
            youtubePlayer.pauseVideo();
          }

          // If YouTube player was in error state, try to recreate it
          if (
            youtubePlayer.getPlayerState &&
            youtubePlayer.getPlayerState() === -1
          ) {
            console.log(
              "YouTube player is in error state, attempting to recreate..."
            );
            createYouTubePlayer();
          }
        }
      } catch (error) {
        console.error("Error resetting YouTube player:", error);
        // On failure, try to recreate the player
        try {
          createYouTubePlayer();
        } catch (recreateError) {
          console.error("Failed to recreate YouTube player:", recreateError);
        }
      }

      // Reset user adjustments to defaults if needed
      // If there's a latency slider, reset it to default
      const latencySlider = document.getElementById("latency-slider");
      const latencyValue = document.getElementById("latency-value");
      if (latencySlider && latencyValue) {
        latencySlider.value = AUDIO_LATENCY_MS;
        latencyValue.textContent = AUDIO_LATENCY_MS;
        window.AUDIO_LATENCY_MS_OVERRIDE = AUDIO_LATENCY_MS;
      }

      // Reset octave selector to default if needed
      const octaveSelector = document.getElementById("octave-selector");
      if (octaveSelector) {
        octaveSelector.value = "-1"; // Default value
        octaveOffset = -1;
        if (window.updateMidiRangeWithOctave) {
          window.updateMidiRangeWithOctave();
        }
      }

      console.log("Game reset complete. Ready for a new round!");
    });
  }
}

// Function to show results screen
function showResultsScreen() {
  console.log("Showing results screen...");
  console.log(
    `Permanent feedback record has ${permanentFeedbackRecord.size} notes recorded`
  );

  // Make sure game state is set to Finished
  gameState = "Finished";

  // Cancel any pending end-of-song timeout
  if (window.endOfSongTimeout) {
    clearTimeout(window.endOfSongTimeout);
    window.endOfSongTimeout = null;
  }

  // Stop the animation loop if it's still running
  stopGameLoop();

  // Cleanup audio resources and pitch detection
  cleanupAudio();

  // Stop YouTube video playback if it's still playing
  try {
    if (
      youtubePlayer &&
      youtubePlayer.getPlayerState &&
      youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING
    ) {
      youtubePlayer.pauseVideo();
    }
  } catch (error) {
    console.warn("Error stopping YouTube playback:", error);
  }

  // Hide gameplay screen
  const gameplayScreen = document.getElementById("gameplay-screen");
  if (gameplayScreen) {
    gameplayScreen.classList.remove("active");
  }

  // Show results screen
  const resultsScreen = document.getElementById("results-screen");
  if (resultsScreen) {
    resultsScreen.classList.add("active");
  }

  // Update results content
  const performanceSummary = document.getElementById("performance-summary");
  if (performanceSummary) {
    // Get note statistics for display
    let totalNotes = 0;
    let matchedNotes = 0;
    let missHighNotes = 0;
    let missLowNotes = 0;
    let noInputNotes = 0;

    // Process all feedback data from the permanent record
    console.log("Processing feedback data for results...");
    permanentFeedbackRecord.forEach((feedback) => {
      totalNotes++;
      console.log(`Note ${totalNotes}: ${feedback.result}`);

      switch (feedback.result) {
        case "match":
          matchedNotes++;
          break;
        case "miss-high":
          missHighNotes++;
          break;
        case "miss-low":
          missLowNotes++;
          break;
        case "no-input":
          noInputNotes++;
          break;
      }
    });

    const matchPercentage =
      totalNotes > 0 ? Math.round((matchedNotes / totalNotes) * 100) : 0;

    // Log statistics for debugging
    console.log(
      `Results stats: ${totalNotes} total notes, ${matchedNotes} matches (${matchPercentage}%)`
    );

    // Determine letter grade based on match percentage
    let grade = "F";
    let gradeColor = "#FF0000"; // red

    if (matchPercentage >= 95) {
      grade = "S";
      gradeColor = "#FFD700"; // gold
    } else if (matchPercentage >= 90) {
      grade = "A+";
      gradeColor = "#00CC00"; // green
    } else if (matchPercentage >= 80) {
      grade = "A";
      gradeColor = "#00AA00";
    } else if (matchPercentage >= 70) {
      grade = "B";
      gradeColor = "#88CC00";
    } else if (matchPercentage >= 60) {
      grade = "C";
      gradeColor = "#CCCC00"; // yellow
    } else if (matchPercentage >= 50) {
      grade = "D";
      gradeColor = "#CC6600"; // orange
    }

    // Create HTML content with more visual elements
    performanceSummary.innerHTML = `
      <div class="results-grade">
        <div class="grade" style="color: ${gradeColor};">${grade}</div>
        <div class="percentage">${matchPercentage}%</div>
      </div>
      
      <div class="results-stats">
        <div class="stat-item">
          <span class="stat-label">Total Notes:</span>
          <span class="stat-value">${totalNotes}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Perfect Matches:</span>
          <span class="stat-value" style="color: ${NOTE_MATCH_COLOR};">${matchedNotes}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Too High:</span>
          <span class="stat-value" style="color: ${NOTE_MISS_HIGH_COLOR};">${missHighNotes}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Too Low:</span>
          <span class="stat-value" style="color: ${NOTE_MISS_LOW_COLOR};">${missLowNotes}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">No Input:</span>
          <span class="stat-value" style="color: ${NOTE_NO_INPUT_COLOR};">${noInputNotes}</span>
        </div>
      </div>
      
      <div class="results-chart">
        <div class="chart-bar match-bar" style="width: ${matchPercentage}%;" title="Perfect Matches: ${matchedNotes}"></div>
        <div class="chart-bar high-bar" style="width: ${Math.round(
          (missHighNotes / totalNotes) * 100
        )}%;" title="Too High: ${missHighNotes}"></div>
        <div class="chart-bar low-bar" style="width: ${Math.round(
          (missLowNotes / totalNotes) * 100
        )}%;" title="Too Low: ${missLowNotes}"></div>
        <div class="chart-bar no-input-bar" style="width: ${Math.round(
          (noInputNotes / totalNotes) * 100
        )}%;" title="No Input: ${noInputNotes}"></div>
      </div>
      
      <div class="results-message">
        ${getPerformanceMessage(grade, matchPercentage)}
      </div>
    `;
  }

  console.log("Results screen displayed");
}

// Function to get encouraging performance message based on grade
function getPerformanceMessage(grade, percentage) {
  switch (grade) {
    case "S":
      return "Amazing performance! You're a vocal superstar!";
    case "A+":
      return "Excellent! Nearly perfect pitch control!";
    case "A":
      return "Great job! You have impressive pitch accuracy!";
    case "B":
      return "Good performance! Keep practicing to improve further.";
    case "C":
      return "Not bad! With a bit more practice, you'll see great improvement.";
    case "D":
      return "You're on your way! Regular practice will help you improve.";
    default:
      return "Thanks for playing! Keep practicing and you'll get better.";
  }
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

// Convert cent difference to accuracy result
function getAccuracyResult(centDifference, hasInput) {
  if (!hasInput) return "no-input";
  if (Math.abs(centDifference) <= PITCH_TOLERANCE_CENTS) return "match";
  return centDifference > 0 ? "miss-high" : "miss-low";
}

// Convert semitone difference to cents (100 cents = 1 semitone)
function semitonesToCents(semitones) {
  return semitones * 100;
}

// Convert MIDI note number to frequency in Hz
function midiToFreq(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// Play a reference tone for the given MIDI note
function playReferenceTone(midiNote) {
  stopReferenceTone(); // Stop any current tone

  // Create oscillator and gain nodes
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  referenceOscillator = audioContext.createOscillator();
  referenceGain = audioContext.createGain();

  // Set frequency from MIDI note (apply octave offset)
  const freq = midiToFreq(midiNote);
  referenceOscillator.type = "sine";
  referenceOscillator.frequency.setValueAtTime(freq, audioContext.currentTime);

  // Set volume
  referenceGain.gain.setValueAtTime(0.5, audioContext.currentTime);

  // Connect nodes
  referenceOscillator.connect(referenceGain);
  referenceGain.connect(audioContext.destination);

  // Start oscillator
  referenceOscillator.start();

  console.log(
    `Playing reference tone: MIDI ${midiNote}, Frequency ${freq.toFixed(1)} Hz`
  );

  // Auto-stop after 1 second
  setTimeout(stopReferenceTone, 1000);
}

// Stop the reference tone
function stopReferenceTone() {
  if (referenceOscillator) {
    referenceOscillator.stop();
    referenceOscillator.disconnect();
    referenceOscillator = null;
  }

  if (referenceGain) {
    referenceGain.disconnect();
    referenceGain = null;
  }
}
