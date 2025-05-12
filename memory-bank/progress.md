# Vocal Stream - Progress Log

## 2025-04-29: Project Initialization

### Phase 1: Project Setup & Static UI (COMPLETED)

- **Step 1.1: Project Creation**

  - Created a new Vite project using the Vanilla JS template with `npm create vite@latest vocal-stream -- --template vanilla`
  - Initialized Git repository
  - Set up basic project structure

- **Step 1.2: Install Core Dependencies**

  - Prepared for installation of `@tonejs/midi` and `pitchfinder` libraries
  - Note: The actual installation will be performed with `npm install @tonejs/midi pitchfinder`

- **Step 1.3: Basic HTML Structure**

  - Created the main HTML structure in `index.html` with three main screen containers:
    - Start Screen (initially visible with `active` class)
    - Gameplay Screen (initially hidden)
    - Results Screen (initially hidden)
  - Added placeholders for YouTube Player and Canvas in the Gameplay Screen
  - Added container for performance results in the Results Screen

- **Step 1.4: Implement Start Screen UI**
  - Added title "Vocal Stream" to the Start Screen
  - Added instructional text for the player
  - Added a "Start Game" button styled as the primary action
  - Created CSS styles in `style.css` for the Start Screen and other components
  - Implemented basic screen switching functionality in `main.js`
  - Set up event listeners for buttons to toggle screen visibility

All tests for Phase 1 have been successfully verified. The project has a functional UI structure that follows the requirements in the Game Design Document.

### Phase 2: Data Loading & Core Media Integration (COMPLETED)

- **Step 2.1: Load and Parse MIDI Data**

  - Added MIDI file to public directory for access from the web application
  - Implemented MIDI file loading using the fetch API
  - Used `@tonejs/midi` library to parse MIDI data
  - Extracted note information (pitch, time, duration) and stored in a structured format
  - Implemented error handling for MIDI loading and parsing

- **Step 2.2: Embed YouTube Player**

  - Integrated YouTube IFrame Player API
  - Created a function to load the API asynchronously
  - Set up player with proper configuration (disabled controls, autoplay off)
  - Implemented event handlers for player ready and state change events
  - Added player controls (play/pause functionality)

- **Step 2.3: Setup Canvas**
  - Added canvas configuration constants (width, height, margins)
  - Implemented canvas setup with proper dimensions
  - Created test rendering to verify canvas is working
  - Prepared canvas for future note visualization

All tests for Phase 2 have been successfully verified. The application can now load and parse the MIDI file, embed and control the YouTube player, and has a configured canvas ready for note visualization.

### Phase 3: Note Visualization & Synchronization (COMPLETED)

- **Step 3.1: Basic Note Rendering (Static)**

  - Implemented MIDI note to canvas coordinate mapping algorithm
  - Created functions to draw note representations on the canvas
  - Added visual markers for octaves (C notes) and note labels
  - Defined appropriate scaling factors for pitch-to-Y-coordinate and duration-to-width
  - Implemented horizontal bars for each note with proper height and width

- **Step 3.2: Implement Game State & Start Logic**

  - Expanded game state management with proper state transitions
  - Implemented screen transitions when state changes
  - Created a proper flow from Start Screen to Gameplay Screen

- **Step 3.3: Basic Video Playback Control**

  - Connected the "Start Game" button to YouTube video playback
  - Implemented pause/play functionality with the game state
  - Synchronized game state changes with YouTube player state

- **Step 3.4: Implement Note Scrolling & "Now" Line**
  - Created the main game loop using requestAnimationFrame
  - Implemented the "now" line visualization at a fixed position
  - Added note scrolling based on current playback time
  - Implemented time window calculation for displaying only visible notes
  - Added latency adjustment capability for future fine-tuning

All tests for Phase 3 have been successfully verified. The application now displays scrolling notes that are synchronized with the YouTube video playback, with a clear "now" line indicating the current playback position.

- **Step 3.5: Enhanced Synchronization (Added)**
  - Adjusted default latency to fix synchronization issues between notes and audio
  - Added user-facing latency adjustment slider for real-time calibration
  - Implemented visual feedback with gold highlighting for notes currently under the "now" line
  - Created a flexible system that allows for different devices and network conditions

### Phase 4: Audio Input & Pitch Detection (COMPLETED)

- **Step 4.1: Request Microphone Access**

  - Implemented Web Audio API functionality to request microphone access with `getUserMedia`
  - Added proper error handling for microphone permission denial
  - Created a user-friendly error message with retry option when microphone access is denied
  - Connected microphone access request to the game start flow
  - Prevented game start when microphone access is denied

- **Step 4.2: Setup Audio Processing Graph**

  - Created an `AudioContext` for processing audio signals
  - Implemented a `MediaStreamSource` node from the microphone input
  - Added an `AnalyserNode` for frequency analysis
  - Connected the audio nodes to create a proper audio processing graph
  - Added resource cleanup functionality when game ends or restarts

- **Step 4.3: Integrate Pitch Detection**
  - Implemented the YIN pitch detection algorithm using the `pitchfinder` library
  - Added functionality to capture audio data from the `AnalyserNode`
  - Implemented periodic pitch detection using `setTimeout`
  - Added frequency filtering to ignore unreliable pitch detection results
  - Created a visual indicator for the detected pitch on the canvas
  - Added text display showing the current detected frequency and note name

All tests for Phase 4 have been successfully verified. The application now requests microphone access, processes audio input, detects pitch in real-time, and visualizes the detected pitch alongside the target notes on the canvas.

### Phase 5: Basic Gameplay Loop & Feedback (COMPLETED)

- **Step 5.1: Real-time Pitch Feedback Visualization**

  - Implemented horizontal line indicator showing player's current pitch
  - Added color-coding for the pitch indicator based on accuracy
  - Created visual volume display for microphone troubleshooting
  - Enhanced pitch visualization with fade-in/fade-out effects
  - Added adaptive pitch smoothing for more stable visualization
  - Created utility for visualizing pitch range to avoid off-screen indicators

- **Step 5.2: Basic Accuracy Comparison Logic**

  - Implemented logic to compare detected pitch with target notes
  - Added tolerance threshold for pitch matching (in cents)
  - Categorized results as "match", "miss-high", "miss-low", or "no-input"
  - Created reference tone button to hear target notes
  - Added calibration panel to show exact frequency comparisons
  - Implemented octave adjustment to handle MIDI transposition needs

- **Step 5.3: Visual Feedback on Notes**

  - Added persistent color-coding of notes based on singing accuracy
  - Implemented feedback storage for each note (Map data structure)
  - Applied color changes to notes as they pass under the "now" line
  - Created visual differentiation between different types of errors
  - Maintained feedback visualization as notes continue scrolling

- **Step 5.4: End of Song Detection & State Change**

  - Enhanced YouTube player state tracking for reliable end detection
  - Added backup detection method using video duration and timeouts
  - Created robust game state transitions for end-of-song events
  - Implemented thorough cleanup of resources when song ends
  - Added detailed logging for troubleshooting completion events

- **Step 5.5: Basic Results Screen Display**

  - Created visually appealing performance summary with statistics
  - Added letter grade (S, A+, A, B, C, D, F) based on match percentage
  - Implemented color-coded performance bars showing result distribution
  - Added personalized feedback message based on performance grade
  - Enhanced styling with CSS for a polished results screen appearance

- **Step 5.6: Implement "Play Again" Logic**

  - Created comprehensive game state reset for new gameplay sessions
  - Added proper cleanup and reinitialization of audio resources
  - Fixed microjphone access persistence between gameplay sessions
  - Implemented reset for user settings (latency, octave adjustment)
  - Added YouTube player recovery logic for error conditions
  - Enhanced audio context handling to prevent browser audio limitations

All tests for Phase 5 have been successfully verified. The application now provides a complete gameplay loop with real-time feedback, accurate note comparison, visual feedback, proper song completion detection, appealing results display, and reliable replay functionality.

## Next Steps

- Phase 6: Deployment
  - Prepare for production build
  - Deploy to Vercel hosting platform
  - Test deployed version for cross-browser compatibility
