# Vocal Stream - Architecture

This document outlines the architecture of the Vocal Stream application, including the project structure, component relationships, and the purpose of each file.

## Project Structure

```
vocal-stream/
├── public/                 # Static assets
│   └── Love_Story_-_Taylor_Swift.mid # Predefined MIDI file for the song
├── src/                    # Source code
│   ├── main.js             # Application initialization and event handling
│   ├── style.css           # Global styles and component-specific styling
│   ├── assets/             # Images and other assets
├── dist/                   # Build output directory (created after build)
│   ├── assets/             # Bundled and optimized assets
│   ├── index.html          # Optimized HTML
│   └── Love_Story_-_Taylor_Swift.mid # Copied MIDI file
├── index.html              # Main HTML structure defining the app layout
├── package.json            # Project dependencies and scripts
├── vercel.json             # Vercel deployment configuration
└── README.md               # Project documentation
```

## Current File Purposes

### HTML Structure (`index.html`)

The main HTML file defines the application structure and includes three main sections:

- **Start Screen**: Initially visible container that presents:

  - Title and instruction text
  - "Start Game" button to begin gameplay

- **Gameplay Screen**: Hidden container that will include:

  - YouTube player placeholder (`#youtube-player-container`)
  - Canvas for note visualization (`#note-canvas`)
  - Game controls including a pause button
  - Latency adjustment slider for synchronization calibration

- **Results Screen**: Hidden container that will display:
  - Performance summary
  - "Play Again" button

### CSS Styles (`src/style.css`)

The CSS file provides styling for all components:

- Sets global styles, typography, and color scheme
- Defines the visibility and layout of the three main screens
- Implements responsive design considerations
- Styles specific UI elements like buttons and containers
- Controls the canvas appearance and dimensions
- Styles error messages for microphone access issues

### JavaScript Entry Point (`src/main.js`)

The main JavaScript file initializes the application and handles core functionality:

- Loads and parses MIDI data for note visualization
- Sets up the YouTube player using the YouTube IFrame API
- Configures the HTML5 Canvas for note visualization
- Manages game state transitions (Ready, Playing, Paused, Finished)
- Provides event listeners for user interaction
- Controls screen transitions (Start → Gameplay → Results)
- Requests and manages microphone access
- Processes audio input using Web Audio API
- Performs real-time pitch detection using the YIN algorithm
- Visualizes detected pitch alongside the note targets

## Component Interactions

1. **Data Flow**:

   - MIDI file is loaded and parsed using the @tonejs/midi library
   - Parsed note data is stored in memory for visualization
   - YouTube player is synchronized with note visualization
   - Audio input from microphone is processed through Web Audio API
   - Pitch is detected from audio input and compared to target notes

2. **UI Flow**:

   - Application starts with the Start Screen visible
   - Clicking "Start Game" requests microphone access
   - After microphone access granted, Start Screen is hidden, Gameplay Screen is shown
   - Game starts YouTube video and begins pitch detection and visualization
   - When game ends (video finishes), Gameplay Screen is hidden and Results Screen is shown
   - Clicking "Play Again" returns to Start Screen and resets the game state

3. **Current Interactions**:
   - MIDI data loading and parsing
   - YouTube video embedding and basic control (play, pause)
   - Canvas initialization with note visualization
   - Microphone access request and audio processing
   - Real-time pitch detection and visualization

## Technical Implementation Notes

This application follows a modular design approach to separate concerns and improve maintainability:

- **Technology Stack**: Vanilla JavaScript, HTML5, CSS3
- **Build Tool**: Vite for fast development and optimized production builds
- **Libraries**: Using `@tonejs/midi` for MIDI parsing and `pitchfinder` for pitch detection
- **Media Integration**: YouTube IFrame Player API for video playback
- **Rendering**: HTML5 Canvas API for note visualization
- **Audio Processing**: Web Audio API for microphone input and audio analysis
- **Browser Support**: Optimized for Chrome

## Data Structures

### MIDI Note Format

The parsed MIDI data is stored as an array of note objects with the following structure:

```javascript
{
  time: number,      // Start time in seconds
  duration: number,  // Duration in seconds
  midi: number,      // MIDI note number (e.g., 60 for C4)
  name: string,      // Scientific notation (e.g., "C4")
  velocity: number   // Normalized velocity (0-1)
}
```

### Game State Management

The game state is managed using a simple state variable with the following possible values:

- `Ready`: Initial state, waiting for user to start the game
- `Playing`: Game is active, video is playing, pitch detection running
- `Paused`: Game is temporarily halted
- `Finished`: Song has ended, displaying results

### Audio Processing

The audio processing pipeline consists of:

1. **Microphone Access**: Using `navigator.mediaDevices.getUserMedia()`
2. **Audio Context**: Web Audio API's `AudioContext` for processing
3. **Source Node**: `MediaStreamSource` created from the microphone stream
4. **Analyzer Node**: `AnalyserNode` for capturing audio data for analysis
5. **Data Processing**: Using `getFloatTimeDomainData()` to get raw audio samples
6. **Pitch Detection**: Using the `pitchfinder` library's YIN algorithm to detect pitch
7. **Visualization**: Mapping the detected frequency to MIDI note number and canvas position

## Current Implementation Status

- ✅ Project structure and UI setup
- ✅ MIDI file parsing
- ✅ YouTube player integration
- ✅ Canvas setup
- ✅ Note visualization and scrolling
- ✅ Pitch detection
- ⬜ Gameplay mechanics
- ⬜ Scoring system

## Deployment Configuration

The application is configured for deployment to Vercel hosting platform:

### Vercel Configuration (`vercel.json`)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

This configuration ensures:

- All routes are handled by the single-page application
- The correct build command is used
- The proper output directory is specified
- Vercel recognizes the project as a Vite application

### Build Process

The build process (`npm run build`) uses Vite to:

1. Bundle JavaScript and CSS assets with optimizations
2. Minify code for production
3. Generate a production-ready version in the `dist` directory
4. Copy static assets from the `public` directory to `dist`

### Hosting Requirements

For optimal functionality, the application requires:

- HTTPS for secure microphone access
- Proper CORS configuration for YouTube embedding
- Support for modern JavaScript features (ES6+)
