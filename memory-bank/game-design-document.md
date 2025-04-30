# Game Design Document: Vocal Stream (Working Title)

**Version:** 0.1 (Initial Scope - Single Song)
**Date:** 2025-04-29

## 1. Overview

Vocal Stream is a single-player music/rhythm game where players sing along to a **pre-selected YouTube karaoke video**. The game provides real-time visual feedback on the player's pitch accuracy by comparing their singing to a visual representation of the song's notes. The goal is to sing accurately and achieve a high score.

**Note:** This initial version (V0.1) is simplified to feature **only one specific song** with manually prepared note data to focus development on the core mechanics (pitch detection, visualization, feedback, scoring). Future versions aim to support user-provided YouTube URLs.

## 2. Genre

Music / Rhythm Game / Karaoke Simulator

## 3. Target Audience

- Karaoke enthusiasts.
- Singers looking to practice pitch and timing.
- Casual gamers interested in music-based challenges.

## 4. Platform(s)

- Initial Target: Web Browser (Desktop Recommended for microphone access and performance)
- Potential Future: Desktop Application (Windows, macOS, Linux)

## 5. Gameplay Mechanics

### 5.1 Core Loop

1.  **Song Initialization:** The game is pre-configured with **one specific YouTube karaoke video URL** and its corresponding note data (pitch, duration, timing) for the main vocal melody.
2.  **Start Game:** The player presses a "Start Game" or "Play" button.
3.  **Loading & Gameplay:**
    - The game loads and starts the pre-selected YouTube video playback, showing lyrics and playing the instrumental track.
    - Simultaneously, the visual representation of the target vocal notes (pre-loaded) scrolls across a designated area of the screen. Notes are represented as horizontal bars:
      - **Vertical Position:** Corresponds to pitch.
      - **Horizontal Length:** Corresponds to duration.
      - **Horizontal Movement:** Notes scroll across the screen, timed with the music, against a "now" line indicating the current playback position.
    - The player sings into their connected microphone.
    - The game captures the microphone input and performs real-time pitch detection.
    - The game visually compares the player's detected pitch and timing against the target note bars currently passing the "now" line.
4.  **Real-time Feedback:** The game provides immediate visual feedback on accuracy (e.g., coloring the note bars, showing a pitch indicator line representing the player's voice relative to the target notes).
5.  **Scoring:** Accuracy (correct pitch held for the correct duration at the correct time) contributes to a running score.
6.  **End of Song:** When the song finishes, the game calculates and displays a final grade or score based on overall performance.

### 5.2 Key Features (V0.1 Scope)

- **YouTube Integration:** Plays a specific, pre-defined YouTube video.
- **Note Visualization:** Displays scrolling pitch/duration bars synchronized with the music (using pre-defined data).
- **Microphone Input:** Captures player's singing.
- **Real-time Pitch Detection:** Analyzes voice input on the fly.
- **Accuracy Feedback:** Shows how well the player is matching pitch and timing during gameplay.
- **Grading System:** Provides a summary score/grade at the end of the song.

## 6. User Interface (UI) / User Experience (UX)

- **Start Screen:**
  - Title / Instructions.
  - "Start Game" button.
  - (No URL input field for V0.1).
- **Gameplay Screen:**
  - Embedded YouTube player (visible for lyrics/video of the pre-defined song).
  - Note visualization area (scrolling bars, "now" line).
  - Real-time score display (optional).
  - Real-time pitch accuracy indicator.
  - "Pause/Stop" controls.
- **Results Screen:**
  - Final Score / Grade (e.g., S, A, B, C, D, F or percentage).
  - Potential breakdown (e.g., % notes hit, pitch accuracy average).
  - Option to "Play Again".

## 7. Input Methods

- **Keyboard/Mouse:** Clicking buttons.
- **Microphone:** Capturing the player's voice.

## 8. Technical Considerations (V0.1 Scope)

- **YouTube Player API:** Need to use the YouTube IFrame Player API to embed, control playback, and synchronize game events for the specific video.
- **Note Data Acquisition:** **Simplified for V0.1.** Note data (pitch, timing, duration) for the single chosen song will be **manually created and stored** within the application (e.g., in a JSON file or similar format). This bypasses the major challenge of automated analysis or database lookup for this initial version.
- **Real-time Pitch Detection:** Requires efficient and reasonably accurate pitch detection algorithm (e.g., using Web Audio API `AnalyserNode` and algorithms like YIN, McLeod Pitch Method). Needs to handle noise and latency.
- **Synchronization:** Critical to keep video playback, note scrolling (based on pre-defined timings), and audio analysis tightly synchronized.
- **Performance:** Real-time audio analysis and rendering need to be performant.

## 9. Monetization

- N/A for this initial version.

## 10. Future Enhancements (Post V0.1)

- **User Song Selection:** Implement YouTube URL input.
- **Note Data Solution:** Research and implement a scalable solution for obtaining note data for arbitrary songs (e.g., algorithmic analysis, integration with existing chart databases like UltraStar FFS, community uploads).
- **Expand Song Library:** Add more pre-defined songs or integrate the note data solution.
- Difficulty Levels.
- Support for local audio/video files.
- More sophisticated scoring and feedback.
- User accounts, leaderboards.
