# Implementation Plan: Vocal Stream V0.1

**Objective:** Build the core V0.1 functionality of the Vocal Stream, focusing on playing one predefined song, visualizing notes, detecting pitch, and providing basic real-time feedback.

**References:**

- Game Design Document (GDD)
- Tech Stack Recommendation
- Development Rules

**Prerequisites:**

- Development environment set up with Node.js and npm (or yarn/pnpm).
- The predefined MIDI file (`Love_Story_-_Taylor_Swift.mid`) is available.
- The specific YouTube video URL for the song is defined (https://www.youtube.com/watch?v=M5w8jc2ljEk).

**Technical Specifications:**

- **Browser Compatibility:** Chrome only for simplicity sake.
- **Deployment Strategy:** Vercel for ease of deployment and familiarity.
- **Testing Approach:** Manual tests as defined in each phase are sufficient.

---

## Phase 1: Project Setup & Static UI

**Step 1.1: Initialize Project**

- **Instruction:** Use Vite to create a new project (select Vanilla JS or TypeScript as per team decision). Initialize npm/yarn/pnpm.
- **Test:** Verify that the Vite development server runs successfully (`npm run dev` or similar) and displays the default Vite landing page in the browser.

**Step 1.2: Install Core Dependencies**

- **Instruction:** Install necessary libraries identified in the tech stack, specifically `@tonejs/midi` and `pitchfinder`.
- **Test:** Check `package.json` and the lock file to confirm the dependencies are added. Ensure the project still builds/runs without errors after installation.

**Step 1.3: Basic HTML Structure**

- **Instruction:** Create the main `index.html` file. Define basic divs/containers for the different game screens/areas outlined in the GDD: Start Screen, Gameplay Screen (including placeholders for YouTube Player and Canvas), and Results Screen (initially hidden).
- **Test:** Load `index.html` in the browser. Verify the basic structure exists using browser developer tools. Initially, only the Start Screen container should be visible.

**Step 1.4: Implement Start Screen UI**

- **Instruction:** Add the static elements to the Start Screen container as defined in the GDD: Title/Instructions text and a "Start Game" button. Apply basic CSS styling for layout.
- **Test:** View the Start Screen in the browser. Verify the title, instructions, and button are displayed correctly and are styled appropriately. The button should not have functionality yet.

---

## Phase 2: Data Loading & Core Media Integration

**Step 2.1: Load and Parse MIDI Data**

- **Instruction:** Implement JavaScript logic to fetch the predefined MIDI file. Use the `@tonejs/midi` library to parse the file upon loading the application. Extract the relevant track (vocal melody) and store the note data (pitch [MIDI number], start time [seconds], duration [seconds]) in a suitable JavaScript array or object structure. Use the Tone.js library which is part of `@atonejs/midi` for conversions, specifically `Tone.Frequency.mtof(midiNote)` and `Tone.Midi(midiNote).toFrequency()`. Here is an example of the data structure the notes should be parsed into.

  ```
    [
      {
        // Essential properties based on GDD & @tonejs/midi output
        time: number,      // Start time of the note in seconds from the beginning of the song.
        duration: number,  // Duration the note is held, in seconds.
        midi: number,      // MIDI note number representing the pitch (e.g., 60 for C4).
        name: string,      // Scientific pitch notation (e.g., "C4", "G#5").

        // Optional but potentially useful properties from @tonejs/midi
        velocity: number   // Normalized velocity (0-1), indicating how "hard" the note was played (useful for expression later).
        // ticks: number    // Start time in MIDI ticks (useful for debugging/alternative timing).
      },
      // ... more note objects
    ]
  ```

- **Test:** Add logging to output the parsed note data structure to the browser console. Verify that the structure contains the expected notes with plausible pitch, time, and duration values corresponding to the MIDI file.

**Step 2.2: Embed YouTube Player**

- **Instruction:** Integrate the YouTube IFrame Player API. Create a placeholder div in the Gameplay Screen section of `index.html`. Write JavaScript to load the IFrame Player API asynchronously and, once ready, create a player instance within the placeholder div, loading the predefined YouTube video URL. Ensure the player is initially hidden.
- **Test:** Temporarily make the Gameplay Screen visible. Verify that the YouTube player loads correctly within its designated area but does not play automatically. Check the browser console for any API loading errors.

**Step 2.3: Setup Canvas**

- **Instruction:** Add an HTML5 `<canvas>` element to the Gameplay Screen container in `index.html`. This element should have configurations stored as constants that are easily changed. For example, `canvasWidth` of 960px, `canvasHeight` of 300px, `marginTop` of 20px, `marginBottom`: 20px. `drawableHeight= canvasHeight - marginTop - marginBottom`. Get a reference to the canvas and its 2D rendering context in JavaScript.
- **Test:** Temporarily draw a simple shape (e.g., a colored rectangle) on the canvas using JavaScript. Verify the shape appears correctly within the canvas area on the Gameplay Screen.

---

## Phase 3: Note Visualization & Synchronization

**Step 3.1: Basic Note Rendering (Static)**

- **Instruction:** Create a function to draw note representations on the canvas. Based on the parsed MIDI data (Step 2.1), draw horizontal bars for each note. The vertical position should map to the note's pitch, and the horizontal length should map to the note's duration. Define appropriate scaling factors for pitch-to-Y-coordinate and duration-to-width. Do not implement scrolling yet. The mapping algorithm for the note pitch is as follows:

  1. Define `minMidiNote` (e.g., 52 for E3) and `maxMidiNote` (e.g., 76 for E5) for the song.
  2. Calculate the total MIDI range: `midiRange = maxMidiNote - minMidiNote`.
  3. For a given note with `noteMidiNumber`:

  - Calculate its relative position within the range (0.0 to 1.0): `relativePitch = (noteMidiNote - minMidiNote) / midiRange`.
  - Important: Since higher pitches should be higher on the canvas (lower Y values), invert the relative pitch for Y calculation: `invertedRelativePitch = 1.0 - relativePitch`.
  - Map this to the canvas's drawable height: `pitchY = marginTop + (invertedRelativePitch \* drawableHeight)`. Remember to use the calculated pitchY as the vertical center or top position when drawing the note bar on the canvas.

- **Test:** Call the rendering function. Verify that static note bars representing the entire song's melody appear on the canvas with varying heights and lengths corresponding to the MIDI data.

**Step 3.2: Implement Game State & Start Logic**

- **Instruction:** Introduce a simple state machine (e.g., using variables or an object) to manage game states: `Ready`, `Playing`, `Paused`, `Finished`. Add an event listener to the "Start Game" button (Step 1.4). When clicked, transition the state from `Ready` to `Playing`, hide the Start Screen, and show the Gameplay Screen.
- **Test:** Click the "Start Game" button. Verify the Start Screen disappears and the Gameplay Screen (containing the YouTube player and canvas with static notes) becomes visible. Log the state changes to the console to confirm transitions.

**Step 3.3: Basic Video Playback Control**

- **Instruction:** Modify the "Start Game" button logic (Step 3.2). When the state transitions to `Playing`, use the YouTube IFrame Player API to start playing the loaded video.
- **Test:** Click "Start Game". Verify the YouTube video begins playing automatically when the Gameplay Screen appears.

**Step 3.4: Implement Note Scrolling & "Now" Line**

- **Instruction:** Create the main game loop using `requestAnimationFrame`. Inside the loop, clear the canvas and redraw the notes. Create a configurable constant `AUDIO_LATENCY_MS` and initially set it to 0 (this will allow for adjustment to account for potential latency between microphone input and visualized notes later). Calculate the horizontal scroll position based on the current playback time obtained from the YouTube Player API, adjusted by the latency constant. Only draw notes that are currently visible within the canvas viewport based on the scroll position. Draw a fixed vertical "now" line on the canvas representing the current time.
- **Test:** Start the game. Verify that the note bars scroll horizontally across the canvas from right to left (or chosen direction). Verify the scrolling speed appears synchronized with the music/lyrics playing in the video. Verify the fixed "now" line is visible.

---

## Phase 4: Audio Input & Pitch Detection

**Step 4.1: Request Microphone Access**

- **Instruction:** Use the Web Audio API (`navigator.mediaDevices.getUserMedia`) to request access to the user's microphone. This should ideally happen shortly before or immediately when the game transitions to the `Playing` state. If user denies permission, display an error message stating the game cannot be played until it has microphone access.
- **Test:** Start the game. Verify the browser prompts the user for microphone permission. Check the console for success or error messages related to acquiring the audio stream.

**Step 4.2: Setup Audio Processing Graph**

- **Instruction:** Once microphone access is granted, create an `AudioContext`. Create a `MediaStreamSource` node from the microphone stream. Create an `AnalyserNode`. Connect the `MediaStreamSource` to the `AnalyserNode`. (Do not connect to `audioContext.destination` yet unless direct monitoring is desired, which is usually not needed here).
- **Test:** Use browser developer tools (e.g., Web Audio inspector in Firefox/Chrome) to visualize the created audio graph and confirm the nodes are connected as expected. Log the `AnalyserNode` properties (like `fftSize`) to the console.

**Step 4.3: Integrate Pitch Detection**

- **Instruction:** In the `requestAnimationFrame` loop (Step 3.4), get the time-domain audio data from the `AnalyserNode` (e.g., using `getFloatTimeDomainData`). Pass this data buffer to the initialized `pitchfinder` library function (e.g., YIN algorithm). Store the detected pitch (frequency in Hz, or null if no pitch detected).
- **Test:** While the game is playing, sing or play a consistent tone into the microphone. Log the detected pitch frequency from `pitchfinder` to the console. Verify it outputs plausible frequency values corresponding to the input tone, and outputs null or inconsistent values during silence.

---

## Phase 5: Basic Gameplay Loop & Feedback

**Step 5.1: Real-time Pitch Feedback Visualization**

- **Instruction:** In the `requestAnimationFrame` loop, draw a simple visual indicator on the canvas representing the currently detected pitch (from Step 4.3). For example, draw a small horizontal line or dot whose vertical position corresponds to the detected frequency, aligned horizontally with the "now" line.
- **Test:** Play the game and sing. Verify the pitch indicator appears near the "now" line and moves up and down vertically in response to the pitch of the singing.

**Step 5.2: Basic Accuracy Comparison Logic**

- **Instruction:** Identify which target note(s) (from the parsed MIDI data) are currently intersecting the "now" line based on the video playback time. Convert the target note's MIDI pitch number to frequency. Compare the user's detected pitch frequency (Step 4.3) with the target note's frequency. Allow for a small margin of error (tolerance), as defined an easily configurable parameter (e.g., a constant variable PITCH_TOLERANCE_CENTS = 50).
- **Test:** Play and sing a note that should match a target note passing the "now" line. Log the comparison result (e.g., "match", "miss-high", "miss-low", "no-input") to the console. Test with correct and incorrect pitches.

**Step 5.3: Basic Visual Feedback on Notes**

- **Instruction:** Modify the note rendering logic (Step 3.4). Based on the accuracy comparison result (Step 5.2), change the appearance of the target note bar as it passes the "now" line (e.g., change its color: green for match, red for miss). The color should ideally persist for the duration the note is under the "now" line while a matching/mismatching pitch is held.
- **Test:** Play and sing. Verify that the target note bars change color appropriately based on singing accuracy relative to the note under the "now" line.

**Step 5.4: End of Song Detection & State Change**

- **Instruction:** Use the YouTube IFrame Player API to detect when the video playback ends. When the video ends, transition the game state from `Playing` to `Finished`. Stop the `requestAnimationFrame` loop and audio processing.
- **Test:** Let the song play to completion. Verify the game state changes to `Finished` (check console logs). Verify note scrolling and pitch detection stop.

**Step 5.5: Basic Results Screen Display**

- **Instruction:** When the game state transitions to `Finished` (Step 5.4), hide the Gameplay Screen and display the (currently basic) Results Screen container. Add simple text like "Song Finished!" and a "Play Again" button.
- **Test:** After the song finishes, verify the Gameplay Screen is hidden and the Results Screen appears with the placeholder text and button.

**Step 5.6: Implement "Play Again" Logic**

- **Instruction:** Add an event listener to the "Play Again" button on the Results Screen. When clicked, reset the game state to `Ready`, hide the Results Screen, potentially reset relevant game variables (like score if implemented), seek the YouTube video to the beginning, and show the Start Screen again.
- **Test:** Finish the song, click "Play Again". Verify the game returns to the initial Start Screen state, ready for another playthrough.

---

## Phase 6: Deployment

**Step 6.1: Prepare for Deployment**

- **Instruction:** Set up a Vercel account if not already available. Configure the project for production build using Vite's build command (`npm run build` or similar).
- **Test:** Run the build command locally and check the generated files in the `dist` directory. Ensure all assets are properly included.

**Step 6.2: Deploy to Vercel**

- **Instruction:** Connect the project repository to Vercel or use Vercel CLI to deploy the application. Configure any necessary environment variables or build settings specific to Vercel.
- **Test:** After deployment, visit the provided Vercel URL. Verify that the application loads correctly, plays the song, and functions as expected in the Chrome browser.

**(Note:** Scoring calculation and detailed grading are omitted from V0.1 as per the GDD simplification and user instructions, but hooks for accuracy detection are included.)\*
