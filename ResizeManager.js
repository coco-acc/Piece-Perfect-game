// // ResizeManager.js
// // A global resize manager to maintain aspect ratio and resize all game elements dynamically.
//export class ResizeManager {
//     /**
//      * @param {HTMLCanvasElement} canvas - The game's canvas element.
//      * @param {number} baseHeight - The reference height (default: 1280).
//      */
//     constructor(canvas, baseHeight = 1280) {
//         this.canvas = canvas;
//         this.baseHeight = baseHeight;
//         this.callbacks = [];
//         // Calculate initial aspect ratio
//         this.aspectRatio = this.calculateAspectRatio();
//         // Listen for window resize events
//         window.addEventListener('resize', () => this.onResize());
//     }

//     // Compute current aspect ratio relative to baseHeight
//     calculateAspectRatio() {
//         return this.canvas.height / this.baseHeight;
//     }

//     // Handle window resize: recalc ratio and notify all listeners
//     onResize() {
//         this.aspectRatio = this.calculateAspectRatio();
//         this.applyResize();
//     }

//     // Invoke all registered callbacks with the new ratio
//     applyResize() {
//         for (let cb of this.callbacks) {
//             cb(this.aspectRatio);
//         }
//     }

//     /**
//      * Register a callback to be called whenever resize occurs.
//      * Callback receives the current aspectRatio as its only argument.
//      * The callback is also invoked immediately upon registration.
//      * @param {(aspectRatio: number) => void} callback
//      */
//     addResizeCallback(callback) {
//         if (typeof callback === 'function') {
//             this.callbacks.push(callback);
//             // Call immediately with current ratio
//             callback(this.aspectRatio);
//         }
//     }
// }

// // Usage example (in your main entry file):
// // import { ResizeManager } from './ResizeManager.js';
// // const resizeMgr = new ResizeManager(canvasElement);
// // resizeMgr.addResizeCallback(ratio => {
// //     // Scale your game/menu elements here, e.g.
// //     game.buttonWidth = 120 * ratio;
// //     game.buttonHeight = 40 * ratio;
// //     mainMenu.titleFontSize = 72 * ratio;
// //     // ...and so on for ImageSelectMenu, VictoryScreen, etc.
// // });
class ResizeManager {
  constructor(canvas, baseHeight = 720) {
    this.canvas = canvas;
    this.baseHeight = baseHeight;
    this.callbacks = [];
    this.aspectRatio = this.calculateAspectRatio();
    window.addEventListener('resize', () => this.onResize());
  }

  calculateAspectRatio() {
    return this.canvas.height / this.canvas.width + 0.4;
  }

  onResize() {
    this.aspectRatio = this.calculateAspectRatio();
    this.applyResize();
  }

  applyResize() {
    for (let cb of this.callbacks) {
      cb(this.aspectRatio);
    }
  }

  addResizeCallback(callback) {
    if (typeof callback === 'function') {
      this.callbacks.push(callback);
      callback(this.aspectRatio);
    }
  }
}

window.ResizeManager = ResizeManager;
