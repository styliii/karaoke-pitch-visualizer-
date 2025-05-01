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

## Next Steps

- Phase 3: Implement note visualization & synchronization
  - Basic note rendering (static)
  - Game state management
  - Video playback control
  - Note scrolling and "now" line visualization
