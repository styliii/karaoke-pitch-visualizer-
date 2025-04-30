# Vocal Stream - Architecture

This document outlines the architecture of the Vocal Stream application, including the project structure, component relationships, and the purpose of each file.

## Project Structure

```
vocal-stream/
├── public/                 # Static assets
│   └── (future) Love_Story_-_Taylor_Swift.mid # MIDI file to be added for the predefined song
├── src/                    # Source code
│   ├── main.js             # Application initialization and event handling
│   ├── style.css           # Global styles and component-specific styling
│   ├── assets/             # Images and other assets
│   └── (future) js/        # JavaScript modules to be created
│       ├── config.js       # Configuration constants
│       ├── ui.js           # UI-related functionality
│       ├── midiParser.js   # MIDI file parsing logic
│       ├── youtubePlayer.js # YouTube player integration
│       ├── noteVisualizer.js # Canvas-based note visualization
│       ├── pitchDetector.js  # Audio input and pitch detection
│       └── gameManager.js    # Game state and logic management
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

The main JavaScript file initializes the application and handles basic interactions:

- Sets up event listeners for button clicks
- Manages screen transitions (Start → Gameplay → Results)
- Provides a foundation for future game logic

## Component Interactions

1. **UI Flow**:

   - Application starts with the Start Screen visible
   - Clicking "Start Game" hides Start Screen and shows Gameplay Screen
   - When game ends, Gameplay Screen will be hidden and Results Screen shown
   - Clicking "Play Again" returns to Start Screen

2. **Future Interactions** (to be implemented):
   - MIDI data loading and parsing
   - YouTube video embedding and synchronization
   - Canvas-based note visualization
   - Microphone input and pitch detection
   - Real-time scoring and feedback

## Technical Implementation Notes

This application follows a modular design approach to separate concerns and improve maintainability:

- **Technology Stack**: Vanilla JavaScript, HTML5, CSS3
- **Build Tool**: Vite for fast development and optimized production builds
- **Future Libraries**: Will integrate `@tonejs/midi` for MIDI parsing and `pitchfinder` for pitch detection
- **Browser Support**: Optimized for Chrome

The current implementation establishes the foundational UI structure and navigation between screens. Future phases will build upon this foundation to implement the core gameplay mechanics.
