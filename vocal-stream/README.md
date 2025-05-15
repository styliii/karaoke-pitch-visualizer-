# Vocal Stream

Vocal Stream is a web-based karaoke game that allows users to sing along to Taylor Swift's "Love Story" and receive real-time feedback on their pitch accuracy.

## Features

- Real-time pitch detection using the microphone
- Visual note representation synchronized with YouTube video
- Immediate feedback on singing accuracy
- Performance results with grading system
- Adjustable latency for better synchronization
- Reference tone for practice

## Tech Stack

- Vanilla JavaScript
- HTML5 & CSS3
- HTML5 Canvas API for note visualization
- Web Audio API for audio processing
- YouTube IFrame Player API for video playback
- `@tonejs/midi` for MIDI parsing
- `pitchfinder` for pitch detection
- Vite for development and building

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
   ```
   npm install
   ```

### Development Server

Run the development server:

```
npm run dev
```

The application will be available at http://localhost:5173 (or another port if 5173 is in use).

### Building for Production

Build the project for production:

```
npm run build
```

The built files will be in the `dist` directory.

## Deployment

### Deploying to Vercel

1. Install the Vercel CLI:

   ```
   npm install -g vercel
   ```

2. Log in to Vercel:

   ```
   vercel login
   ```

3. Deploy to Vercel:

   ```
   vercel
   ```

   Or for production:

   ```
   vercel --prod
   ```

4. Follow the prompts to complete the deployment

### Manual Deployment

1. Build the project:

   ```
   npm run build
   ```

2. Upload the contents of the `dist` directory to your web server

## Usage

1. Open the deployed application in a web browser (preferably Chrome)
2. Click "Start Game" to begin
3. Allow microphone access when prompted
4. Sing along with the song, trying to match the highlighted notes
5. View your performance results at the end of the song

## Browser Compatibility

- Chrome (recommended): Full support
- Firefox: Limited support
- Safari: Limited support
- Edge: Limited support

## Known Issues

- Microphone access may require HTTPS on some browsers
- Pitch detection accuracy varies depending on microphone quality
- Synchronization between video and notes may require adjustment using the latency slider
