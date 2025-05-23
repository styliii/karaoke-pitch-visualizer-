### Recommended Tech Stack (Simple & Robust Vocal Stream V0.1)

- **Core Language:** **JavaScript (ES6+)**
  - _The native language of the web browser._
- **Structure & Markup:** **HTML5 & CSS3**
  - _Standard web technologies for structure and styling._
- **Rendering Engine (Notes Visualization):** **HTML5 Canvas API**
  - _Built-in browser API for performant 2D graphics rendering needed for scrolling notes._
- **Audio Input & Analysis:** **Web Audio API**
  - _Standard browser API for microphone access and real-time audio processing._
- **Pitch Detection Library:** **`pitchfinder`** (or similar JavaScript library)
  - _Provides algorithms (e.g., YIN, AMDF) to detect pitch from the Web Audio API data stream._
- **MIDI Parsing Library (for V0.1):** **`@tonejs/midi`** (or similar JavaScript library like `midi-file`)
  - _Parses note pitch, timing, and duration data from the predefined MIDI file._
- **YouTube Integration:** **YouTube IFrame Player API**
  - _Official API for embedding and controlling YouTube video playback via JavaScript._
- **Development Environment:** **Node.js + npm** (or yarn/pnpm)
  - _Standard for managing project dependencies (libraries) and running build tools._
- **Build Tool / Dev Server:** **Vite**
  - _Provides an extremely fast development server and optimized production builds with minimal configuration._
- **Type Checking (Optional but Recommended):** **TypeScript**
  - _Adds static typing on top of JavaScript, catching errors early and improving code robustness and maintainability._
