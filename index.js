const { Scene, Game, AUTO, Scale } = Phaser;

class MainGame extends Scene {
  constructor() {
    super("Game");
    this.map = null;
    this.stages = [];
    this.score = 0;
    this.scoreText = null;
    this.timer = null;
    this.timerText = null;
    this.gameOver = false;
    this.timerPaused = false;
    this.stagFoundSound = null;
    this.elapsedTime = 0;
    this.pinch = {
      active: false,
      initialDistance: 0,
      initialZoom: 0,
    };
    this.drag = {
      active: false,
      startX: 0,
      startY: 0,
    };
  }

  preload() {
    this.load.setPath("assets");
    this.load.image("background", "Map3k.jpg");
    this.load.audio('stagFound', 'sound.mp3');
    // Load stag images dynamically
    for (let i = 1; i <= 5; i++) {
      this.load.image(`stag${i}`, `Stag${i}.png`);
    }

    // Load coin image for animation
    this.load.image("coin", "Stag1.png");
  }

  create() {
    // Add background image (map)
    this.map = this.add.image(0, 0, "background").setOrigin(0, 0);
    this.cameras.main.setBounds(0, 0, this.map.width, this.map.height);
    this.stagFoundSound = this.sound.add('stagFound');
    this.cameras.main.centerOn(this.map.width / 2, this.map.height / 2);
    this.cameras.main.zoom = 0.5;

    // Enable multi-touch
    this.input.addPointer(1);

    this.input.on("pointerdown", this.onPointerDown, this);
    this.input.on("pointermove", this.onPointerMove, this);
    this.input.on("pointerup", this.onPointerUp, this);
    this.input.on("wheel", this.onWheel, this);

    // Add stages
    this.addStages();

    // Timer for the game
    this.timer = this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });
  }

  addStages() {
    const stageData = [
      { x: 2742, y: 694, scale: 0.3 },
      { x: 321, y: 671, scale: 0.4 },
      { x: 1255, y: 916, scale: 0.4 },
      { x: 1174, y: 1535, scale: 0.29 },
      { x: 2866, y: 1738, scale: 0.3 },
    ];

    for (let i = 1; i <= 5; i++) {
      const data = stageData[i - 1];
      const stage = this.add.image(data.x, data.y, `stag${i}`).setScale(data.scale).setInteractive();
      stage.on("pointerdown", () => this.onStageClick(stage));
      this.stages.push(stage);
    }
  }

  onStageClick(stage) {
    if (this.gameOver) return;

    // Disable further interaction with the stage
    stage.disableInteractive();

    this.stagFoundSound.play();

    // Scale up the stag slightly and animate it using GSAP
    gsap.to(stage, {
      scale: stage.scale * 1.2,  // Scale the stag up by 20%
      duration: 0.3,
      yoyo: true,  // Return to original size after scaling up
      repeat: -1,
      onComplete: () => {
        // Once the animation is complete, set a golden border and fade the stag color
        stage.setTint(0x808080);  // Fade the color (optional)
        stage.setStrokeStyle(5, 0xFFD700);  // Golden border
      }
    });

    this.playCoinAnimation(stage);
    // Increase the score and update the score text
    this.score++;

    // Update the corresponding stag icon in HTML
    const stagIcon = document.getElementById(`stag-icon-${this.score}`);
    if (stagIcon) stagIcon.style.opacity = 1;

    // Check if all stags are found
    if (this.score === this.stages.length) this.endGame(true);
  }

  playCoinAnimation(stage) {
    // Create a coin image at the position of the clicked stag
    const coin = this.add.image(stage.x, stage.y, 'coin').setScale(0.3).setDepth(10);

    // Define the target position for the coin animation (navbar or score area)
    const targetX = 4000; // Example position, adjust based on your UI layout
    const targetY = 0;

    // Animate the coin moving from stag position to the navbar/score area
    gsap.to(coin, {
      x: targetX,
      y: targetY,
      scale: 0.1,
      duration: 2.5,
      ease: "none",
      onComplete: () => {
        // Destroy the coin after the animation is done
        coin.destroy();
      },
    });
  }


updateTimer() {
    if (this.gameOver || this.timerPaused) return;

    this.elapsedTime++; // Increment elapsed time
    const timeLeft = 45 - this.elapsedTime;
    
    const timeElement = document.getElementById("time");
    timeElement.innerText = timeLeft.toString().padStart(2, "0");

    if (timeLeft <= 0) this.endGame(false);
  }

endGame(userWon) {
    this.gameOver = true;
    this.timer.remove();

    // Calculate remaining time
    const remainingTime = Math.max(0, 45 - this.elapsedTime);

    // Save score and remaining time to local storage
    const gameResult = {
      score: this.score,
      remainingTime: remainingTime,
      totalTime: 45
    };
    localStorage.setItem('lastGameResult', JSON.stringify(gameResult));

    // Show Game Over or Game Win popup based on the result
    if (userWon) {
      document.getElementById('game-win-popup').style.display = 'flex';
    } else {
      document.getElementById('game-over-popup').style.display = 'flex';
    }

    // Update the displayed score and time in the popup
    const scoreElement = document.getElementById(userWon ? 'final-score-win' : 'final-score');
    if (scoreElement) {
      scoreElement.textContent = `Score: ${this.score}`;
    }
    const timeElement = document.getElementById(userWon ? 'final-time-win' : 'final-time');
    if (timeElement) {
      timeElement.textContent = `Time: ${remainingTime} seconds remaining`;
    }

    // Handle Restart
    document.getElementById('restart-button').addEventListener('click', () => location.reload());
    document.getElementById('restart-button-win').addEventListener('click', () => location.reload());
  }
  onPointerDown(pointer) {
    if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
      this.pinch.active = true;
      this.pinch.initialDistance = Phaser.Math.Distance.Between(this.input.pointer1.x, this.input.pointer1.y, this.input.pointer2.x, this.input.pointer2.y);
      this.pinch.initialZoom = this.cameras.main.zoom;
    } else {
      this.drag.active = true;
      this.drag.startX = this.cameras.main.scrollX + pointer.x / this.cameras.main.zoom;
      this.drag.startY = this.cameras.main.scrollY + pointer.y / this.cameras.main.zoom;
    }
  }

  onPointerMove(pointer) {
    if (this.pinch.active) {
      const currentDistance = Phaser.Math.Distance.Between(this.input.pointer1.x, this.input.pointer1.y, this.input.pointer2.x, this.input.pointer2.y);
      this.setZoom(this.pinch.initialZoom * (currentDistance / this.pinch.initialDistance));
    } else if (this.drag.active) {
      this.cameras.main.scrollX = this.drag.startX - pointer.x / this.cameras.main.zoom;
      this.cameras.main.scrollY = this.drag.startY - pointer.y / this.cameras.main.zoom;
    }
  }

  onPointerUp() {
    this.pinch.active = false;
    this.drag.active = false;
  }

  onWheel(event) {
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    this.setZoom(this.cameras.main.zoom * zoomFactor);
  }

  setZoom(newZoom) {
    const clampedZoom = Phaser.Math.Clamp(newZoom, 0.5, 3);
    this.cameras.main.setZoom(clampedZoom);
  }
}

const config = {
  type: AUTO,
  width: 1920,
  height: 1080,
  parent: "game-container",
  backgroundColor: "#66464",
  scale: {
    mode: Scale.WIDTH_CONTROLS_HEIGHT,
    autoCenter: Scale.WIDTH_CONTROLS_HEIGHT,
  },
  scene: [MainGame],
};
let game;

function goFullScreen() {
    const fullscreenButton = document.getElementById("fullscreen_button");
  
    if (fullscreenButton) {
      fullscreenButton.addEventListener("click", () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error enabling fullscreen: ${err.message}`);
          });
        } else {
          document.exitFullscreen().catch((err) => {
            console.error(`Error exiting fullscreen: ${err.message}`);
          });
        }
      });
    }
  }

function checkOrientation() {
    const orientationOverlay = document.getElementById("orientation-overlay");
    const gameScene = game ? game.scene.getScene("Game") : null;
    // const gameScene = game.scene.getScene("Game");
  
    if (window.innerHeight > window.innerWidth) {
      // Portrait mode
      document.getElementById("hidesection").style.display="hide"
      orientationOverlay.style.display = "flex"; // Show overlay
      if (gameScene) {
        gameScene.timerPaused = true; // Pause the timer
        gameScene.scene.pause(); // Pause the game scene
      }
    } else {
      // Landscape mode
      orientationOverlay.style.display = "none"; // Hide overlay
      if (gameScene) {
        gameScene.timerPaused = false; // Resume the timer
        gameScene.scene.resume(); // Resume the game scene
      }
    }
  }

// Initialize everything when the page loads
window.addEventListener("load", () => {
  goFullScreen();
  checkOrientation();
  window.addEventListener("resize", checkOrientation);

  // Initialize Phaser game
  game = new Game(config);

  displayLastGameResult();
});

function displayLastGameResult() {
    const lastGameResult = localStorage.getItem('lastGameResult');
    if (lastGameResult) {
      const { score, remainingTime, totalTime } = JSON.parse(lastGameResult);
      const lastResultElement = document.getElementById('last-game-result');
      if (lastResultElement) {
        lastResultElement.textContent = `Last game: Score ${score}, Time ${remainingTime}/${totalTime} seconds`;
      }
    }
  }