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
├── index.html              # Main HTML structure defining the app layout
└── package.json            # Project dependencies and scripts
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

### JavaScript Entry Point (`src/main.js`)

The main JavaScript file initializes the application and handles core functionality:

- Loads and parses MIDI data for note visualization
- Sets up the YouTube player using the YouTube IFrame API
- Configures the HTML5 Canvas for note visualization
- Manages game state transitions (Ready, Playing, Paused, Finished)
- Provides event listeners for user interaction
- Controls screen transitions (Start → Gameplay → Results)

## Component Interactions

1. **Data Flow**:

   - MIDI file is loaded and parsed using the @tonejs/midi library
   - Parsed note data is stored in memory for visualization
   - YouTube player is synchronized with note visualization (to be implemented)

2. **UI Flow**:

   - Application starts with the Start Screen visible
   - Clicking "Start Game" hides Start Screen, shows Gameplay Screen, and starts YouTube video
   - When game ends (video finishes), Gameplay Screen is hidden and Results Screen is shown
   - Clicking "Play Again" returns to Start Screen and resets the game state

3. **Current Interactions**:
   - MIDI data loading and parsing
   - YouTube video embedding and basic control (play, pause)
   - Canvas initialization with test visualization

## Technical Implementation Notes

This application follows a modular design approach to separate concerns and improve maintainability:

- **Technology Stack**: Vanilla JavaScript, HTML5, CSS3
- **Build Tool**: Vite for fast development and optimized production builds
- **Libraries**: Using `@tonejs/midi` for MIDI parsing and `pitchfinder` for pitch detection (to be implemented)
- **Media Integration**: YouTube IFrame Player API for video playback
- **Rendering**: HTML5 Canvas API for note visualization
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
- `Playing`: Game is active, video is playing
- `Paused`: Game is temporarily halted
- `Finished`: Song has ended, displaying results

## Current Implementation Status

- ✅ Project structure and UI setup
- ✅ MIDI file parsing
- ✅ YouTube player integration
- ✅ Canvas setup
- ⬜ Note visualization and scrolling
- ⬜ Pitch detection
- ⬜ Gameplay mechanics
- ⬜ Scoring system
