import "./style.css";

// Application initialization
document.addEventListener("DOMContentLoaded", () => {
  console.log("Vocal Stream initialized");

  // Initial state with only Start Screen visible
  // The CSS handles this with the 'active' class

  // For testing, we can add simple screen toggling
  const startButton = document.getElementById("start-button");
  const pauseButton = document.getElementById("pause-button");
  const playAgainButton = document.getElementById("play-again-button");

  const startScreen = document.getElementById("start-screen");
  const gameplayScreen = document.getElementById("gameplay-screen");
  const resultsScreen = document.getElementById("results-screen");

  if (startButton) {
    startButton.addEventListener("click", () => {
      console.log("Start button clicked");
      startScreen.classList.remove("active");
      gameplayScreen.classList.add("active");
    });
  }

  if (pauseButton) {
    pauseButton.addEventListener("click", () => {
      console.log("Pause button clicked");
      // Pause functionality will be implemented later
    });
  }

  if (playAgainButton) {
    playAgainButton.addEventListener("click", () => {
      console.log("Play Again button clicked");
      resultsScreen.classList.remove("active");
      startScreen.classList.add("active");
    });
  }
});
