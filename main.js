class AssetManager {
    constructor() {
        this.images = {};
        this.loadedCount = 0;
        this.totalCount = 0;
        this.onComplete = null;
    }

    load(name, src) {
        this.totalCount++;
        const img = new Image();
        img.src = src;
        img.onload = () => {
            this.loadedCount++;
            if (this.loadedCount === this.totalCount && this.onComplete) {
                this.onComplete();
            }
        };
        this.images[name] = img;
    }

    get(name) {
        return this.images[name];
    }

    whenDone(callback) {
        this.onComplete = callback;
    }
}

let assets;
let currentScreen = null;

function drawButton(ctx, btn, isHovered = false, assets) {
    const buttonImg = assets.get("button");

    if (buttonImg && buttonImg.complete) {
        if (isHovered) {
            ctx.filter = "brightness(1.4)";
        }

        ctx.drawImage(buttonImg, btn.x, btn.y, btn.width, btn.height);
        ctx.filter = "none";
    } else {
        // Fallback if image not loaded
        ctx.fillStyle = isHovered ? "#666" : "#333";
        ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
    }

    ctx.fillStyle = "#fff";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    // ctx.fillText(btn.label || btn.text, btn.x + btn.width / 2, btn.y + 26);
    ctx.fillText(btn.label || btn.text, btn.x + btn.width / 2, btn.y + btn.height / 2 + 6);

}

function enableButtonHoverTracking(instance) {
    instance.hoveredButton = null;

    instance._onMouseMove = function(event) {
        const rect = instance.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (instance.canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (instance.canvas.height / rect.height);

        instance.hoveredButton = instance.buttons.find(btn =>
            x >= btn.x && x <= btn.x + btn.width &&
            y >= btn.y && y <= btn.y + btn.height
        );

        instance.render?.();
    };

    instance.canvas.addEventListener("mousemove", instance._onMouseMove);
}

function getBestTimeKey(mode, rows, cols, imageSrc) {
    return `bestTime_${mode}_${rows}x${cols}_${imageSrc}`;
}

function createJigsawPath(ctx, width, height, tabs) {
    const tabSize = Math.min(width, height) / 3;
    const bumpSize = Math.min(width, height) / 3.5; // Size of the bump

    ctx.beginPath();
    ctx.moveTo(0, 0);

    // --- Top Edge ---
    if (tabs.top === 0) {
        ctx.lineTo(width, 0);
    } else {
        const midX = width / 2;
        ctx.lineTo(midX - bumpSize, 0);
        
        if (tabs.top > 0) {
            // Convex tab (outward curve)
            ctx.bezierCurveTo(
                midX - bumpSize / 2, -tabSize,  // Control point 1 (above)
                midX + bumpSize / 2, -tabSize,  // Control point 2 (above)
                midX + bumpSize, 0             // End point
            );
        } else {
            // Concave tab (inward curve)
            ctx.bezierCurveTo(
                midX - bumpSize / 2, tabSize,  // Control point 1 (below)
                midX + bumpSize / 2, tabSize,  // Control point 2 (below)
                midX + bumpSize, 0             // End point
            );
        }
        ctx.lineTo(width, 0);
    }

    // --- Right Edge ---
    if (tabs.right === 0) {
        ctx.lineTo(width, height);
    } else {
        const midY = height / 2;
        ctx.lineTo(width, midY - bumpSize);
        
        if (tabs.right > 0) {
            // Convex tab (outward curve)
            ctx.bezierCurveTo(
                width + tabSize, midY - bumpSize / 2,  // Control point 1 (right)
                width + tabSize, midY + bumpSize / 2,  // Control point 2 (right)
                width, midY + bumpSize                 // End point
            );
        } else {
            // Concave tab (inward curve)
            ctx.bezierCurveTo(
                width - tabSize, midY - bumpSize / 2,  // Control point 1 (left)
                width - tabSize, midY + bumpSize / 2,  // Control point 2 (left)
                width, midY + bumpSize                 // End point
            );
        }
        ctx.lineTo(width, height);
    }

    // --- Bottom Edge ---
    if (tabs.bottom === 0) {
        ctx.lineTo(0, height);
    } else {
        const midX = width / 2;
        ctx.lineTo(midX + bumpSize, height);
        
        if (tabs.bottom > 0) {
            // Convex tab (outward curve)
            ctx.bezierCurveTo(
                midX + bumpSize / 2, height + tabSize,  // Control point 1 (below)
                midX - bumpSize / 2, height + tabSize,   // Control point 2 (below)
                midX - bumpSize, height                 // End point
            );
        } else {
            // Concave tab (inward curve)
            ctx.bezierCurveTo(
                midX + bumpSize / 2, height - tabSize,  // Control point 1 (above)
                midX - bumpSize / 2, height - tabSize,  // Control point 2 (above)
                midX - bumpSize, height                 // End point
            );
        }
        ctx.lineTo(0, height);
    }

    // --- Left Edge ---
    if (tabs.left === 0) {
        ctx.lineTo(0, 0);
    } else {
        const midY = height / 2;
        ctx.lineTo(0, midY + bumpSize);
        
        if (tabs.left > 0) {
            // Convex tab (outward curve)
            ctx.bezierCurveTo(
                -tabSize, midY + bumpSize / 2,  // Control point 1 (left)
                -tabSize, midY - bumpSize / 2,  // Control point 2 (left)
                0, midY - bumpSize              // End point
            );
        } else {
            // Concave tab (inward curve)
            ctx.bezierCurveTo(
                tabSize, midY + bumpSize / 2,  // Control point 1 (right)
                tabSize, midY - bumpSize / 2,  // Control point 2 (right)
                0, midY - bumpSize             // End point
            );
        }
        ctx.lineTo(0, 0);
    }

    ctx.closePath();
}


class PuzzlePiece {
    constructor(image, x, y, width, height, correctX, correctY) {
        this.image = image;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.correctX = correctX;
        this.correctY = correctY;
        this.dragging = false;

        //piece highlighting
        this.isHighlighted = false;
        this.highlightColor = 'rgba(255, 255, 0, 0.3)'; // Yellow highlight
        this.highlightWidth = 5; // Border thickness 

        this.highlightEffects = {
            glow: false,
            pulse: false,
            pulsePhase: 0
        };
    }
   
    draw(context) {
        context.save();
        if (this.dragging) {
            context.shadowColor = 'rgba(0,0,0,0.5)';
            context.shadowBlur = 10;
            context.shadowOffsetY = 5;
        }
        // Draw the offscreen canvas containing the piece image.
        // Instead of scaling the offscreen canvas to the base piece size,
        // we want to draw it at its natural (larger) size, offset so that
        // the central base area aligns with (this.x, this.y).
        // The offscreen canvas width and height are (base + 2*margin).
        context.drawImage(
            this.image,
            0, 0, this.image.width, this.image.height,
            this.x - this.imageMargin, // shift left by margin
            this.y - this.imageMargin, // shift up by margin
            this.image.width,
            this.image.height
        );

        // Draw highlight if active
        if (this.isHighlighted) {
            this.highlightEffects.pulsePhase += 0.1;
            const pulseAlpha = (0.3 + (Math.sin(this.highlightEffects.pulsePhase)) * 0.2);
            context.save();
            context.strokeStyle = 'ebf1ef';
            // context.strokeStyle = `rgba(255, 255, 0, ${pulseAlpha})`;
            context.lineWidth = 3 + Math.sin(this.highlightEffects.pulsePhase) * 2;
            context.strokeRect(this.x, this.y, this.width, this.height);
            context.restore();
        }
        context.restore();
    }

    containsPoint(x, y) {
        return x > this.x && x < this.x + this.width && y > this.y && y < this.y + this.height;
    }

    highlight() {
        this.isHighlighted = true;
    }

    unhighlight() {
        this.isHighlighted = false;
    }
}

class Game {
    constructor(canvas, context, imageSrc, rows, cols, mode, assets, ImagePaths) {
        this.assets = assets;
        this.canvas = canvas;
        this.canvas.width = this.canvas.width;
        this.canvas.height = this.canvas.height;
        this.context = context;
        this.imageSrc = imageSrc;
        this.rows = rows;
        this.cols = cols;
        this.imagePaths = ImagePaths;

        this.hoveredButton = null;

        this.pieces = [];
        this.draggingPiece = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.mode = mode; //grid or jigsaw
        this.loadImage();

        // Undo/redo system
        this.history = [];       // Stores all game states
        this.currentState = -1;  // Points to current state in history
        this.maxStates = 20;     // Limit history size
        this.folderImageCount = 3;

        //time tracking
        this.startTime = null;
        this.elapsedTime = 0; // in milliseconds

        this.timerInterval = null;
        this.isTimerRunning = false;
        this.userPaused = false; // 👈 NEW: true if player clicked "Pause"
        this.isGameOver = false;

        this.gridImg = assets.get("wood")

        // Padding above and below the grid
        this.topPadding = 40;
        this.bottomPadding = 40;

        this.buttons = [
            { label: "Pause", action: "pause" },
            { label: "Undo", action: "undo" },
            { label: "Redo", action: "redo" },
            { label: "Restart", action: "restart" },
            { label: "Exit", action: "exit" }
        ];

    }

     startTimer() {
        if (this.isTimerRunning) return;
        
        this.startTime = Date.now() - this.elapsedTime;
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000); // Update every second
        
        this.isTimerRunning = true;
    }

    pauseTimer() {
        if (!this.isTimerRunning) return;
        clearInterval(this.timerInterval);
        this.isTimerRunning = false;
    }

    togglePause() {
        if (this.isTimerRunning) {
            this.pauseTimer();
            this.userPaused = true;
            this.buttons.find(b => b.action === "pause").label = "Resume";
        } else {
            this.resumeTimer();
            this.userPaused = false;
            this.buttons.find(b => b.action === "pause").label = "Pause";
        }
        this.render();
    }
    
    resumeTimer() {
        if (this.isTimerRunning) return;
        
        this.startTime = Date.now() - this.elapsedTime;
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
        
        this.isTimerRunning = true;
    }

    resetTimer() {
        clearInterval(this.timerInterval);
        this.elapsedTime = 0;
        this.startTime = null;
        this.isTimerRunning = false;
        // this.renderTimer(); // Update display
        this.render();
    }

    updateTimer() {
        this.elapsedTime = Date.now() - this.startTime;
        // Trigger a full render of the game including the updated timer.
        this.render();
    }

     // Format time for display
    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    saveState() {
        // Only save if more than 100ms since last save
        if (this.lastSave && Date.now() - this.lastSave < 100) return;
        this.lastSave = Date.now();

        // Remove any states after current position (if we undo then make a new move)
        this.history = this.history.slice(0, this.currentState + 1);
        
        // Don't save if we've reached max states
        if (this.history.length >= this.maxStates) {
            this.history.shift(); // Remove oldest state
            this.currentState--;
        }
        
        // Save current positions of all pieces
        const state = this.pieces.map(piece => ({
            x: piece.x,
            y: piece.y,
            rotation: piece.rotation || 0 // Include if you have rotation
        }));
        
        this.history.push(state);
        this.currentState = this.history.length - 1;
    }

    // Restore a previous state
    restoreState() {
        if (this.currentState < 0 || this.currentState >= this.history.length) return;
        
        const state = this.history[this.currentState];
        state.forEach((pieceState, index) => {
            this.pieces[index].x = pieceState.x;
            this.pieces[index].y = pieceState.y;
            if (pieceState.rotation !== undefined) {
                this.pieces[index].rotation = pieceState.rotation;
            }
        });
        
        this.render();
    }

    undo() {
        if (this.currentState > 0) {
            this.currentState--;
            this.restoreState();
        }
    }

    redo() {
        if (this.currentState < this.history.length - 1) {
            this.currentState++;
            this.restoreState();
        }
    }

    // loadImage() {
    //     this.image = new Image();
    //     this.image.src = this.imageSrc;
    //     this.image.onload = () => {
    //         // Calculate the aspect ratio and scale the image to fit canvas
    //         const canvasAspect = this.canvas.width / this.canvas.height;
    //         const imageAspect = this.image.width / this.image.height;
            
    //         let drawWidth, drawHeight;
    //         if (imageAspect > canvasAspect) {
    //             // Image is wider than canvas (relative to height)
    //             drawWidth = this.canvas.width;
    //             drawHeight = this.canvas.width / imageAspect;
    //         } else {
    //             // Image is taller than canvas (relative to width)
    //             drawHeight = this.canvas.height;
    //             drawWidth = this.canvas.height * imageAspect;
    //         }
            
    //         // Center the image on canvas
    //         // this.drawX = (this.canvas.width - drawWidth) / 2;
    //         // this.drawY = (this.canvas.height - drawHeight) / 2;
    //         // this.drawWidth = drawWidth;
    //         // this.drawHeight = drawHeight;

    //         // Adjust available height to exclude the padding
    //         const availableHeight = this.canvas.height - this.topPadding - this.bottomPadding;

    //         if (imageAspect > canvasAspect) {
    //             drawWidth = this.canvas.width;
    //             drawHeight = this.canvas.width / imageAspect;
    //         } else {
    //             drawHeight = availableHeight;
    //             drawWidth = availableHeight * imageAspect;
    //         }

    //         // Center horizontally, and start below topPadding
    //         this.drawX = (this.canvas.width - drawWidth) / 2;
    //         this.drawY = this.topPadding;  // Starts below the padding area
    //         this.drawWidth = drawWidth;
    //         this.drawHeight = drawHeight;

            
    //          // Choose the appropriate pieces method based on mode.
    //         if (this.mode === 'grid') {
    //             this.createPieces();
    //         } else if (this.mode === 'jigsaw') {
    //             this.createJigSawPieces();
    //         } else {
    //             console.error("Unknown game mode:", this.mode);
    //         }
    
    //         this.startTimer(); // Start timer when pieces are created
    //     };
    // }
    loadImage() {
        this.image = new Image();
        this.image.src = this.imageSrc;
        this.image.onload = () => {
            // Calculate the aspect ratio and scale the image to fit canvas height
            const canvasAspect = this.canvas.width / this.canvas.height;
            const imageAspect = this.image.width / this.image.height;
            
            let drawWidth, drawHeight;
            
            // Always scale based on height
            drawHeight = this.canvas.height - this.topPadding - this.bottomPadding;
            drawWidth = drawHeight * imageAspect;
            
            // If the scaled width is wider than canvas, adjust to fit width instead
            if (drawWidth > this.canvas.width) {
                drawWidth = this.canvas.width;
                drawHeight = drawWidth / imageAspect;
            }

            // Center horizontally, and start below topPadding
            this.drawX = (this.canvas.width - drawWidth) / 2;
            this.drawY = this.topPadding;
            this.drawWidth = drawWidth;
            this.drawHeight = drawHeight;

            // Choose the appropriate pieces method based on mode.
            if (this.mode === 'grid') {
                this.createPieces();
            } else if (this.mode === 'jigsaw') {
                this.createJigSawPieces();
            } else {
                console.error("Unknown game mode:", this.mode);
            }

            this.startTimer(); // Start timer when pieces are created
        };
    }

    createPieces() {
        // Calculate piece dimensions based on scaled image
        const pieceWidth = this.drawWidth / this.cols;
        const pieceHeight = this.drawHeight / this.rows;
        
        // Generate all possible positions (initially in correct order)
        let shuffledPositions = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                shuffledPositions.push({ 
                    x: this.drawX + col * pieceWidth, 
                    y: this.drawY + row * pieceHeight 
                });
            }
        }
        // Shuffle the positions
        shuffledPositions = shuffledPositions.sort(() => Math.random() - 0.5);

        // Create each puzzle piece
        let index = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                // Correct position for this piece
                const correctX = this.drawX + col * pieceWidth;
                const correctY = this.drawY + row * pieceHeight;
                // Shuffled position for this piece
                const { x, y } = shuffledPositions[index++];
                
                // Create a canvas for this individual piece
                const pieceCanvas = document.createElement('canvas');
                pieceCanvas.width = pieceWidth;
                pieceCanvas.height = pieceHeight;
                const pieceContext = pieceCanvas.getContext('2d');
                
                // Draw the correct portion of the image onto the piece canvas
                pieceContext.drawImage(
                    this.image, 
                    col * (this.image.width / this.cols),  // Source x
                    row * (this.image.height / this.rows), // Source y
                    this.image.width / this.cols,          // Source width
                    this.image.height / this.rows,         // Source height
                    0, 0,                                  // Destination x,y
                    pieceWidth,                             // Destination width
                    pieceHeight                             // Destination height
                );
                
                // Create the puzzle piece object
                const piece = new PuzzlePiece(
                    pieceCanvas,  // The canvas with piece image
                    x, y,         // Current position (shuffled)
                    pieceWidth, pieceHeight, // Dimensions
                    correctX, correctY       // Correct position
                );

                piece.imageMargin = 0;
                this.pieces.push(piece);
            }
        }

        this.addEventListeners();
        // this.startTimer(); // Start timer when pieces are created
        this.render();
        
    }

    createJigSawPieces() {
        // Calculate the base piece dimensions (collision/layout area without tabs).
        const pieceWidth = this.drawWidth / this.cols;
        const pieceHeight = this.drawHeight / this.rows;

        // Generate a tabMap for interlocking edges.
        const tabMap = [];
        for (let row = 0; row < this.rows; row++) {
            tabMap[row] = [];
            for (let col = 0; col < this.cols; col++) {
                const top = row === 0 ? 0 : -tabMap[row - 1][col].bottom;
                const left = col === 0 ? 0 : -tabMap[row][col - 1].right;
                const right = (col === this.cols - 1) ? 0 : (Math.random() > 0.5 ? 1 : -1);
                const bottom = (row === this.rows - 1) ? 0 : (Math.random() > 0.5 ? 1 : -1);
                tabMap[row][col] = { top, right, bottom, left };
            }
        }

        // Generate the target (correct) positions for each piece.
        const correctPositions = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                correctPositions.push({
                    x: this.drawX + col * pieceWidth,
                    y: this.drawY + row * pieceHeight
                });
            }
        }
        // Shuffle positions for initial placement.
        const shuffledPositions = correctPositions.slice().sort(() => Math.random() - 0.5);

        // Define an extra margin used only for the drawn image (the tabs).
        // This margin will be added to the offscreen canvas, but not to the collision area.
        const margin = Math.min(pieceWidth, pieceHeight) / 2; 

        let index = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                // Correct (target) position for the piece.
                const correctPos = correctPositions[index];
                // Shuffled (starting) position.
                const startPos = shuffledPositions[index];

                // Create an offscreen canvas for the piece that is larger than the base piece.
                const canvas = document.createElement('canvas');
                // Offscreen canvas dimensions include the extra margin for the tabs.
                canvas.width = pieceWidth + 2 * margin;
                canvas.height = pieceHeight + 2 * margin;
                const ctx = canvas.getContext('2d');

                // Set up the jigsaw clipping region.
                // Translate by the extra margin so the jigsaw shape is drawn at (margin, margin)
                // using the base piece dimensions.
                ctx.save();
                ctx.translate(margin, margin);
                createJigsawPath(ctx, pieceWidth, pieceHeight, tabMap[row][col]);
                ctx.restore();
                ctx.clip();

                // Calculate the corresponding portion of the source image.
                const srcPieceWidth = this.image.width / this.cols;
                const srcPieceHeight = this.image.height / this.rows;
                // Compute scale factors (if needed) between the drawn image and source image.
                const scaleX = srcPieceWidth / pieceWidth;
                const scaleY = srcPieceHeight / pieceHeight;
                // Expand the source rectangle by the margin (scaled) to cover the extra tabs.
                const srcX = col * srcPieceWidth - margin * scaleX;
                const srcY = row * srcPieceHeight - margin * scaleY;
                const srcW = srcPieceWidth + 2 * margin * scaleX;
                const srcH = srcPieceHeight + 2 * margin * scaleY;

                // Draw the source image onto the offscreen canvas.
                ctx.drawImage(
                    this.image,
                    srcX, srcY, srcW, srcH,
                    0, 0, canvas.width, canvas.height
                );

                // (Optional) Draw a border around the jigsaw shape.
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.stroke();

                // Create a new PuzzlePiece.
                // Use only the base piece dimensions for collision and layout.
                const piece = new PuzzlePiece(
                    canvas,       // The offscreen canvas contains the full jigsaw image with extra margin.
                    startPos.x,   // starting x (shuffled)
                    startPos.y,   // starting y (shuffled)
                    pieceWidth,   // base width (used for snapping/collision)
                    pieceHeight,  // base height
                    correctPos.x, // target x
                    correctPos.y  // target y
                );
                // Store the extra margin (for drawing purposes) on the piece.
                piece.imageMargin = margin;

                this.pieces.push(piece);
                index++;
            }
        }

        this.addEventListeners();
        this.render();
    }

    addEventListeners() {
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
        this.keydownHandler = this.handleKeydown.bind(this);

        this.canvas.addEventListener('mousedown', this.onMouseDown);
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('mouseup', this.onMouseUp);

        this.canvas.addEventListener('touchstart', this.onTouchStart);
        this.canvas.addEventListener('touchmove', this.onTouchMove);
        this.canvas.addEventListener('touchend', this.onTouchEnd);

        document.addEventListener('keydown', this.keydownHandler);

        enableButtonHoverTracking(this);
    }

    handleKeydown(e) {
        if (e.ctrlKey && e.key === 'z') {
            this.undo();
        } else if (e.ctrlKey && e.key === 'y') {
            this.redo();
        } else if (e.key === 'p') {
            this.togglePause();
        } else if (e.key === 'r') {
            this.resumeTimer();
        }
    }

    onTouchStart(e) {
        if (!this.isTimerRunning && !this.isGameOver) {
            for (let btn of this.buttons) {
                if (
                    offsetX >= btn.x && offsetX <= btn.x + btn.width &&
                    offsetY >= btn.y && offsetY <= btn.y + btn.height
                ) {
                    this.handleButtonAction(btn.action);
                    return;
                }
            }
            return;
        }

        e.preventDefault();
        const touch = e.touches[0];
        this.onMouseDown(touch);
    }

    onTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.onMouseMove(touch);
    }

    onTouchEnd() {
        this.onMouseUp();
    }

    onMouseDown(event) {

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const offsetX = (event.clientX - rect.left) * scaleX;
        const offsetY = (event.clientY - rect.top) * scaleY;

        if (!this.isTimerRunning && !this.isGameOver) {
            // Still allow button clicks
            for (let btn of this.buttons) {
                if (
                    offsetX >= btn.x && offsetX <= btn.x + btn.width &&
                    offsetY >= btn.y && offsetY <= btn.y + btn.height
                ) {
                    this.handleButtonAction(btn.action);
                    return;
                }
            }
            return; // 🔒 Block puzzle piece interaction when paused
        }

        // Check button clicks first
        for (let btn of this.buttons) {
            if (
                offsetX >= btn.x && offsetX <= btn.x + btn.width &&
                offsetY >= btn.y && offsetY <= btn.y + btn.height
            ) {
                this.handleButtonAction(btn.action);
                return;
            }
        }

        // Unhighlight all pieces
        this.pieces.forEach(p => p.unhighlight());

        for (let piece of this.pieces) {
            if (piece.containsPoint(offsetX, offsetY)) {
                piece.highlight(); // Highlight the selected piece
                this.draggingPiece = piece;
                this.offsetX = offsetX - piece.x;
                this.offsetY = offsetY - piece.y;
                break;
            }
        }
        // this.handleOverlappingPieces(this.draggingPiece);
        this.render();
        
        // Check pieces in reverse order (top-most first)
        for (let i = this.pieces.length - 1; i >= 0; i--) {
            const piece = this.pieces[i];
            if (piece.containsPoint(offsetX, offsetY)) {
                this.draggingPiece = piece;
                this.offsetX = offsetX - piece.x;
                this.offsetY = offsetY - piece.y;
                
                // Bring piece to front
                this.pieces.splice(i, 1);
                this.pieces.push(piece);
                break;
            }
        }
    
        this.saveState();
    }

    onMouseMove(event) {
        if (!this.draggingPiece) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const offsetX = (event.clientX - rect.left) * scaleX;
        const offsetY = (event.clientY - rect.top) * scaleY;
        
        // Update dragging piece's position with clamping
        this.draggingPiece.x = Math.max(0, Math.min(
            this.canvas.width - this.draggingPiece.width, 
            offsetX - this.offsetX
        ));
        this.draggingPiece.y = Math.max(0, Math.min(
            this.canvas.height - this.draggingPiece.height, 
            offsetY - this.offsetY
        ));
        
        // this.needsRender = true;
        this.render();
    }

    checkVictory() {
        return this.pieces.every(piece => 
            Math.abs(piece.x - piece.correctX) < 2 &&
            Math.abs(piece.y - piece.correctY) < 2
        );
    }

    // checkCollision(pieceA, pieceB) {
    //     return !(pieceA.x >= pieceB.x + pieceB.width ||
    //              pieceA.x + pieceA.width <= pieceB.x ||
    //              pieceA.y >= pieceB.y + pieceB.height ||
    //              pieceA.y + pieceA.height <= pieceB.y);
    // }
    checkCollision(pieceA, pieceB) {
        // Check if pieceA is exactly on top of pieceB
        return (
            // Check if pieceA's bottom edge is at the same position as pieceB's top edge
            pieceA.y + pieceA.height === pieceB.y &&
            // Check if there's horizontal overlap between the pieces
            pieceA.x < pieceB.x + pieceB.width &&
            pieceA.x + pieceA.width > pieceB.x
        );
    }

    destroy() {
        if (this._destroyed) return;
            this._destroyed = true;
        // Remove canvas mouse events
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);

        // Remove canvas touch events
        this.canvas.removeEventListener('touchstart', this.onTouchStart);
        this.canvas.removeEventListener('touchmove', this.onTouchMove);
        this.canvas.removeEventListener('touchend', this.onTouchEnd);

        // Remove keyboard shortcuts
        document.removeEventListener('keydown', this.keydownHandler);
        //remove hover listener
        this.canvas.removeEventListener("mousemove", this._onMouseMove);

        // Stop timer
        clearInterval(this.timerInterval);
    }

    handleButtonAction(action) {
        switch (action) {
            case "pause":
                this.togglePause();
                break;
            case "undo":
                this.undo();
                break;
            case "redo":
                this.redo();
                break;
            case "restart":
                if (confirm("Restart the puzzle?")) {
                    this.resetTimer();
                    this.pieces = [];
                    this.loadImage(); // reload same image
                }
                break;
            case "exit":
                case "exit":
                    if (confirm("Exit to menu?")) {
                        this.destroy();
                        // Use the assets that were passed to the Game constructor
                        currentScreen = new MainMenu(this.canvas, this.context, (selectedMode) => {
                            currentScreen.destroy();
                            currentScreen = new ImageSelectMenu(this.canvas, this.context, 
                                selectedMode, 
                                (mode, imagePath, rows, cols) => {
                                    currentScreen.destroy();
                                    currentScreen = new Game(this.canvas, this.context, imagePath, rows, cols, 
                                        mode, this.assets // Pass along the assets
                                    );
                                }, 
                                this.assets // Pass assets to ImageSelectMenu
                            );
                            currentScreen.render();
                        }, this.assets); // Pass assets to MainMenu
                        currentScreen.render();
                    }
                    break;
        }
    }

    handleOverlappingPieces(movedPiece) {
        // Calculate the dimensions of a single cell.
        const pieceWidth = this.drawWidth / this.cols;
        const pieceHeight = this.drawHeight / this.rows;

        // Helper: use Math.floor to compute the cell index reliably.
        // Optionally, add half the piece dimension to get a center-based cell calculation.
        const getCell = (piece) => {
            const col = Math.floor((piece.x - this.drawX + pieceWidth / 2) / pieceWidth);
            const row = Math.floor((piece.y - this.drawY + pieceHeight / 2) / pieceHeight);
            return { col, row };
        };

        // Get the grid cell of the moved piece (which is already snapped).
        const movedCell = getCell(movedPiece);

        // Loop through all pieces to detect overlaps.
        for (let piece of this.pieces) {
            if (piece === movedPiece) continue;

            const cell = getCell(piece);
            if (cell.col === movedCell.col && cell.row === movedCell.row) {
                // Overlap is detected.
                // Move the overlapped piece outside of the grid to the right.
                // Here, we position it just a few pixels to the right of the grid boundary.
                const offset = 30; // adjust as needed
                piece.x = this.drawX + this.drawWidth + offset;
                // Optionally, align its y coordinate with its current grid row.
                piece.y = cell.row * pieceHeight + this.drawY;
            }
        }
    }

    onMouseUp() {
        if (!this.draggingPiece) return;

        // Calculate grid dimensions
        const pieceWidth = this.drawWidth / this.cols;
        const pieceHeight = this.drawHeight / this.rows;

        // Find the nearest grid position to snap to
        const gridX = Math.round((this.draggingPiece.x - this.drawX) / pieceWidth) * pieceWidth + this.drawX;
        const gridY = Math.round((this.draggingPiece.y - this.drawY) / pieceHeight) * pieceHeight + this.drawY;

        // Snap to the nearest grid if within threshold.
        const threshold = 30;
        const distX = Math.abs(this.draggingPiece.x - gridX);
        const distY = Math.abs(this.draggingPiece.y - gridY);
        if (distX < threshold && distY < threshold) {
            this.draggingPiece.x = gridX;
            this.draggingPiece.y = gridY;
        }

        // Handle overlapping pieces after the drop.
        this.handleOverlappingPieces(this.draggingPiece);

        // Save final state
        this.saveState();
        this.draggingPiece = null;
        this.render();

        // Check victory
        if (this.checkVictory()) {
            this.showVictoryMessage();
        }
    }

    drawGridBackground() {
        // Save current context settings.
        this.context.save();
        
        // Set the fill style for the grid area. 
        
        // Fill the grid area.
        this.context.save();
        this.context.globalAlpha = 0.7; // 70% opacity
        this.context.drawImage(this.gridImg, this.drawX, this.drawY, this.drawWidth, this.drawHeight);
        this.context.globalCompositeOperation = "multiply"; // Apply tint
        this.context.fillStyle = "rgba(0, 0, 124, 0.7)"; //  tint
        this.context.fillRect(this.drawX, this.drawY, this.drawWidth, this.drawHeight);
        this.context.globalCompositeOperation = "source-over"; // Reset
        this.context.restore(); // Restore original state
        
        // Now draw the boundary on top of the fill.
        this.context.strokeStyle = 'rgba(156, 160, 166, 0.7)';  // Customize boundary color.
        this.context.lineWidth = 3;            // Customize boundary thickness.
        this.context.strokeRect(this.drawX, this.drawY, this.drawWidth, this.drawHeight);
        
        // Restore previous context settings.
        this.context.restore();
    }

    showVictoryMessage() {
        this.imagePaths = Array.from({ length: this.folderImageCount }, (_, i) => `IMG/pieces/image${i + 1}.jpg`);

        this.pauseTimer();
        this.isGameOver = true;

        //save elapsedTime before destroying game
        const timer = this.formatTime(this.elapsedTime);

        //save game screen
        const gameSnapshot = this.canvas.cloneNode();
        gameSnapshot.getContext("2d").drawImage(this.canvas, 0, 0);

        const key = getBestTimeKey(this.mode, this.rows, this.cols, this.imageSrc);
        const currentBest = parseInt(localStorage.getItem(key));
        let bestTime = false;

        if (!currentBest || this.elapsedTime < currentBest) {
            localStorage.setItem(key, this.elapsedTime);
            bestTime = true;
            console.log("🔥 New best time saved:", this.elapsedTime);
        }
       
        this.destroy();
        const gameInstance = this;
        currentScreen = new VictoryScreen(
            this.canvas,
            this.context,
            timer,
            () => {
            gameInstance.destroy();
            currentScreen.destroy?.();

            // Pick a new image from a different one
            const otherImages = this.imagePaths.filter(img => img !== this.imageSrc);
            const newImage = otherImages[Math.floor(Math.random() * otherImages.length)];

            currentScreen = new Game(
                this.canvas,
                this.context,
                newImage,
                this.rows,
                this.cols,
                this.mode,
                this.assets,
                this.imagePaths
            );
        },
        this.assets,
        this.imagePaths,   // ✅ Fix: pass image list
        this.imageSrc,     // ✅ Fix: pass current image
        this.mode,
        this.rows,
        this.cols,
        gameSnapshot, // ✅ New: pass the image
        bestTime
        );

    }

    renderButtons() {
        const ctx = this.context;
        const buttonWidth = 120;
        const buttonHeight = 40;
        const gap = 15;

        const totalHeight = this.buttons.length * buttonHeight + (this.buttons.length - 1) * gap;
        const startY = (this.canvas.height - totalHeight) / 2;
        const x = this.drawX - buttonWidth - 30; // left of the grid

        ctx.font = "18px Arial";
        ctx.textAlign = "center";

        for (let i = 0; i < this.buttons.length; i++) {
            const btn = this.buttons[i];
            btn.x = x;
            btn.y = startY + i * (buttonHeight + gap);
            btn.width = buttonWidth;
            btn.height = buttonHeight;

            const isHovered = this.hoveredButton === btn;
            drawButton(ctx, btn, isHovered, this.assets);
        }
    }

    render() {
        // if (!this.needsRender) return;
        this.needsRender = false;
    
        // Clear the entire canvas.
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw a global background.
        const bg = this.assets.get("background");
        if (bg && bg.complete) {
            this.context.drawImage(bg, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.context.fillStyle = "#222";
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Fill the grid background and draw its boundary.
        this.drawGridBackground();
        
        // Draw grid lines (if needed).
        this.context.strokeStyle = 'rgba(255,255,255,0.5)';
        for(let row = 1; row < this.rows; row++) {
            const y = this.drawY + row * (this.drawHeight / this.rows);
            this.context.beginPath();
            this.context.moveTo(this.drawX, y);
            this.context.lineTo(this.drawX + this.drawWidth, y);
            this.context.stroke();
        }
        for(let col = 1; col < this.cols; col++) {
            const x = this.drawX + col * (this.drawWidth / this.cols);
            this.context.beginPath();
            this.context.moveTo(x, this.drawY);
            this.context.lineTo(x, this.drawY + this.drawHeight);
            this.context.stroke();
        }
        
        // Draw the puzzle pieces on top.
        this.pieces.forEach(piece => piece.draw(this.context));
        
        // Draw the timer overlay.
        this.context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.context.fillRect(10, 10, 120, 40);
        this.context.fillStyle = 'white';
        this.context.font = '24px Arial';
        this.context.textAlign = 'left';
        this.context.fillText(`Time: ${this.formatTime(this.elapsedTime)}`, 20, 35);

        this.renderButtons();
        // const isHovered = this.hoveredButton === btn;

        if (!this.isTimerRunning && this.userPaused) {
            this.context.fillStyle = "rgba(0, 0, 0, 0.6)";
            this.context.fillRect(this.drawX, this.drawY, this.drawWidth, this.drawHeight);
            
            this.context.fillStyle = "#fff";
            this.context.font = "48px Arial";
            this.context.textAlign = "center";
            this.context.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2);
        }
    }
}

class VictoryScreen {
     constructor(canvas, context, timeElapsed, onPlayAgain, assets,
        imagePaths, lastImage, mode, rows, cols, backgroundSnapshot, bestTime) {

        this.canvas = canvas;
        this.context = context;
        this.timeElapsed = timeElapsed;
        this.onPlayAgain = onPlayAgain;
        this.assets = assets;
        this.imagePaths = imagePaths; 
        this.lastImage = lastImage;
        this.mode = mode;
        this.rows = rows;
        this.cols = cols;
        this.backgroundSnapshot = backgroundSnapshot; // ✅ frozen game view
        this.bestTime = bestTime;

        // Initialize buttons
        this.buttons = [];
        this.playButton = null;
        this.backButton = null;
        this.hoveredButton = null;

        // Bind event handlers
        this.boundClick = this.handleClick.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        
        // Add event listeners
        this.canvas.addEventListener('click', this.boundClick);
        this.canvas.addEventListener('mousemove', this.boundMouseMove);

        this.confetti = [];
        this.animate = this.animate.bind(this);
        this.createConfetti();
        requestAnimationFrame(this.animate);
        console.log(this.bestTime);

        this.render();
    }

   handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);

        const prevHovered = this.hoveredButton;
        let newHovered = null;

        if (this.playButton &&
            x >= this.playButton.x && x <= this.playButton.x + this.playButton.width &&
            y >= this.playButton.y && y <= this.playButton.y + this.playButton.height) {
            newHovered = this.playButton;
        } else if (this.backButton &&
            x >= this.backButton.x && x <= this.backButton.x + this.backButton.width &&
            y >= this.backButton.y && y <= this.backButton.y + this.backButton.height) {
            newHovered = this.backButton;
        }

        // if (newHovered !== prevHovered) {
        //     this.hoveredButton = newHovered;
        //     this.render(); // Re-render only if hover state changed
        // }
    }

    createConfetti() {
        const colors = ["#ff0", "#f0f", "#0ff", "#0f0", "#f00", "#00f"];

        for (let i = 0; i < 150; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height / 2;
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.confetti.push(new ConfettiParticle(x, y, color));
        }
    }

    getStarRating() {
        // Simple scoring based on time (you can customize this!)
        if (this.timeElapsed < 30) return 3;
        if (this.timeElapsed < 60) return 2;
        return 1;
    }

    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);

        if (this.playButton && 
            x >= this.playButton.x && x <= this.playButton.x + this.playButton.width &&
            y >= this.playButton.y && y <= this.playButton.y + this.playButton.height) {
            this.destroy();

            // Pick a new image that is different from the previous one
            const otherImages = this.imagePaths.filter(img => img !== this.lastImage);
            const newImage = otherImages[Math.floor(Math.random() * otherImages.length)];

            currentScreen = new Game(this.canvas, this.context, newImage, this.rows, this.cols, this.mode, this.assets);
            return;
        }

        if (this.backButton && 
            x >= this.backButton.x && x <= this.backButton.x + this.backButton.width &&
            y >= this.backButton.y && y <= this.backButton.y + this.backButton.height) {
            this.destroy();
            // Transition back to Main Menu
            currentScreen = new MainMenu(this.canvas, this.context, (selectedMode) => {
                currentScreen.destroy?.();
                currentScreen = new ImageSelectMenu(this.canvas, this.context, selectedMode, (mode, imagePath, rows, cols) => {
                    currentScreen.destroy?.();
                    currentScreen = new Game(this.canvas, this.context, imagePath, rows, cols, mode, this.assets);
                }, this.assets);
                currentScreen.render();
            }, this.assets);
            currentScreen.render();
        }
    }

     destroy() {
        // Remove event listeners
        this.canvas.removeEventListener('click', this.boundClick);
        this.canvas.removeEventListener('mousemove', this.boundMouseMove);
        this.confetti = [];
    }

    animate() {
        // this.render(); // draw the victory screen

        for (let p of this.confetti) {
            p.update();
            p.draw(this.context);
        }
        this.render(); // draw the victory screen

        this.confetti = this.confetti.filter(p => p.isAlive());

        if (this.confetti.length > 0) {
            requestAnimationFrame(this.animate);
        }
    }

    // render() {
    //     const ctx = this.context;

    //     ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    //     ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    //     ctx.fillStyle = "#fff";
    //     ctx.font = "48px Arial";
    //     ctx.textAlign = "center";
    //     ctx.fillText("🎉 You Did It!", this.canvas.width / 2, 100);

    //     const rating = this.getStarRating();

    //     // Draw stars
    //     const starSize = 60;
    //     const totalWidth = rating * starSize + (rating - 1) * 10;
    //     const startX = (this.canvas.width - totalWidth) / 2;
    //     const y = 160;

    //     for (let i = 0; i < rating; i++) {
    //         ctx.fillStyle = "gold";
    //         ctx.beginPath();
    //         ctx.moveTo(startX + i * (starSize + 10) + starSize / 2, y);
    //         for (let j = 0; j < 5; j++) {
    //             const angle = (Math.PI / 5) * (2 * j + 1);
    //             const x = Math.cos(angle) * (starSize / 2);
    //             const yy = Math.sin(angle) * (starSize / 2);
    //             ctx.lineTo(startX + i * (starSize + 10) + starSize / 2 + x, y + yy);
    //         }
    //         ctx.closePath();
    //         ctx.fill();
    //     }

    //     // Show time
    //     ctx.fillStyle = "#fff";
    //     ctx.font = "24px Arial";
    //     ctx.fillText(`Time: ${this.timeElapsed}s`, this.canvas.width / 2, y + 100);

    //     // Play again button
    //     const buttonWidth = 200;
    //     const buttonHeight = 60;
    //     const buttonX = (this.canvas.width - buttonWidth) / 2;
    //     const buttonY = y + 160;

    //     ctx.fillStyle = "#444";
    //     ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    //     ctx.strokeStyle = "#fff";
    //     ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

    //     ctx.fillStyle = "#fff";
    //     ctx.font = "26px Arial";
    //     ctx.fillText("Play Again", this.canvas.width / 2, buttonY + 40);

    //     this.playButton = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

    //     // Back to Menu button
    //     const backWidth = 200;
    //     const backHeight = 60;
    //     const backX = (this.canvas.width - backWidth) / 2;
    //     const backY = buttonY + 80;

    //     ctx.fillStyle = "#444";
    //     ctx.fillRect(backX, backY, backWidth, backHeight);
    //     ctx.strokeStyle = "#fff";
    //     ctx.strokeRect(backX, backY, backWidth, backHeight);

    //     ctx.fillStyle = "#fff";
    //     ctx.font = "24px Arial";
    //     ctx.fillText("Back to Menu", this.canvas.width / 2, backY + 40);

    //     // Save for click detection
    //     this.backButton = { x: backX, y: backY, width: backWidth, height: backHeight };
    // }
     render() {
        const ctx = this.context;

        if (this.backgroundSnapshot) {
            ctx.drawImage(this.backgroundSnapshot, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            ctx.fillStyle = "#111";
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = "#fff";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("🎉 You Did It!", this.canvas.width / 2, 100);

        const rating = this.getStarRating();

        // Draw stars
        const starSize = 60;
        const totalWidth = rating * starSize + (rating - 1) * 10;
        const startX = (this.canvas.width - totalWidth) / 2;
        const y = 160;

        for (let i = 0; i < rating; i++) {
            ctx.fillStyle = "gold";
            ctx.beginPath();
            ctx.moveTo(startX + i * (starSize + 10) + starSize / 2, y);
            for (let j = 0; j < 5; j++) {
                const angle = (Math.PI / 5) * (2 * j + 1);
                const x = Math.cos(angle) * (starSize / 2);
                const yy = Math.sin(angle) * (starSize / 2);
                ctx.lineTo(startX + i * (starSize + 10) + starSize / 2 + x, y + yy);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Show time
        ctx.fillStyle = "#fff";
        ctx.font = "24px Arial";
        ctx.fillText(`Time: ${this.timeElapsed}s`, this.canvas.width / 2, y + 100);

        if (this.bestTime) {
            ctx.fillStyle = "#00ffcc";
            ctx.font = "22px Arial";
            ctx.fillText("🎉 New Best Time!🎉", this.canvas.width / 2, y + 140);
        }

        // Play again button
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonX = (this.canvas.width - buttonWidth) / 2;
        const buttonY = y + 160;

        // Draw button with hover effect
        ctx.fillStyle = this.hoveredButton === this.playButton ? "#555" : "#444";
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

        ctx.fillStyle = "#fff";
        ctx.font = "26px Arial";
        ctx.fillText("Play Again", this.canvas.width / 2, buttonY + 40);

        this.playButton = { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };

        // Back to Menu button
        const backWidth = 200;
        const backHeight = 60;
        const backX = (this.canvas.width - backWidth) / 2;
        const backY = buttonY + 80;

        // Draw button with hover effect
        ctx.fillStyle = this.hoveredButton === this.backButton ? "#555" : "#444";
        ctx.fillRect(backX, backY, backWidth, backHeight);
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(backX, backY, backWidth, backHeight);

        ctx.fillStyle = "#fff";
        ctx.font = "24px Arial";
        ctx.fillText("Back to Menu", this.canvas.width / 2, backY + 40);

        // Save for click detection
        this.backButton = { x: backX, y: backY, width: backWidth, height: backHeight };

        // Draw confetti
        for (let p of this.confetti) {
            p.draw(ctx);
        }
    }
}

class ConfettiParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 6 + 4;
        this.velocityX = (Math.random() - 0.5) * 8;
        this.velocityY = Math.random() * -10 - 5;
        this.gravity = 0.4;
        this.alpha = 1;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 10;
    }

    update() {
        this.velocityY += this.gravity;
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.rotation += this.rotationSpeed;
        this.alpha -= 0.01;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }

    isAlive() {
        return this.alpha > 0;
    }
}


function generateBackgroundImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a2a6c');
    gradient.addColorStop(0.5, '#b21f1f');
    gradient.addColorStop(1, '#fdbb2d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add subtle noise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 1000; i++) {
        ctx.fillRect(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            2, 2
        );
    }
    
    return canvas.toDataURL('image/png');
}

// Usage:
const bgImageUrl = generateBackgroundImage();
// You can use this URL as src for your background image

// === GLOBAL SCREEN CONTEXT ===

class MainMenu {
    constructor(canvas, context, startCallback, assets) {
        this.canvas = canvas;
        this.context = context;
        this.startCallback = startCallback;
        this.assets = assets;

        this.boundHandleClick = this.handleClick.bind(this);
        this.canvas.addEventListener("click", this.boundHandleClick);

        this.selectedMode = null; //jigsaw or grid
        // this.imagesLoaded = false;
        // this.imagesToLoad = 12; // Number of images we need to load
        // this.imagesLoadedCount = 0;

        enableButtonHoverTracking(this);

        // Main buttons
        this.buttons = [
            {                             
                text: "Start Game",
                x: (canvas.width / 2) - 220,
                y: canvas.height / 1.12,
                width: 190,
                height: 10,
                visible: true // Initially hidden until mode is selected
            },                                
            {                             
                text: "Options",
                x: canvas.width / 2,
                y: canvas.height / 1.12,
                width: 190,
                height: 10
            },                                
            {                             
                text: "Help",
                x: (canvas.width / 2) + 220,
                y: canvas.height / 1.12,
                width: 190,
                height: 10
            }                                              
        ];

        // Game mode selection cards
        this.gameModes = [
            {                             
                text: "Classic Grid",
                description: "Traditional grid-based puzzle with clean rectangular pieces that snap into place.",
                x: (canvas.width / 2) - 160,
                y: canvas.height / 1.85,
                width: 300,
                height: 400,
                type: "grid",
                selected: false
            },                                
            {                             
                text: "Jigsaw",
                description: "Challenging interlocking pieces with tabs and blanks that fit together precisely.",
                x: (canvas.width / 2) + 160,
                y: canvas.height / 1.85,
                width: 300,
                height: 400,
                type: "jigsaw",
                selected: false
            }               
        ];

        this.addEventListeners();
    }

    // onMouseMove(event) {
    //     const rect = this.canvas.getBoundingClientRect();
    //     const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
    //     const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);

    //     this.hoveredButton = this.buttons.find(btn =>
    //         x >= btn.x && x <= btn.x + btn.width &&
    //         y >= btn.y && y <= btn.y + btn.height
    //     );

    //     this.render(); // Re-render to update hover visual
    // }

    destroy() {
        this.canvas.removeEventListener("click", this.boundHandleClick);
        // this.canvas.removeEventListener("mousemove", this.handleMouseMove);
        this.canvas.removeEventListener("mousemove", this._onMouseMove);
      }

    // imageLoaded() {
    //     this.imagesLoadedCount++;
    //     if (this.imagesLoadedCount >= this.imagesToLoad) {
    //         this.imagesLoaded = true;
    //         this.render(); // Render when all images are loaded
    //     }
    // }

    // Helper function to wrap text within a width
    wrapText(context, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let testLine = '';
        let lineCount = 0;
        const maxLines = 3; // Maximum lines we want to show

        for (let n = 0; n < words.length; n++) {
            testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0 && lineCount < maxLines - 1) {
                context.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
                lineCount++;
            } else if (lineCount >= maxLines - 1) {
                // If we've reached max lines, truncate with ellipsis
                const ellipsis = '...';
                let truncatedLine = line + words[n];
                while (context.measureText(truncatedLine + ellipsis).width > maxWidth && truncatedLine.length > 0) {
                    truncatedLine = truncatedLine.substring(0, truncatedLine.length - 1);
                }
                context.fillText(truncatedLine + ellipsis, x, y);
                return y + lineHeight;
            } else {
                line = testLine;
            }
        }
        context.fillText(line, x, y);
        return y + lineHeight;
    }

    addEventListeners() {
        this.canvas.addEventListener("click", this.boundHandleClick);
        // this.canvas.addEventListener("click", this.handleClick.bind(this));
    }

    handleClick(event) {
        // Convert event coordinates and determine which UI element was clicked.
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;

        // Check if a mode card is clicked.
        for (let mode of this.gameModes) {
            const left = mode.x - mode.width / 2;
            const right = mode.x + mode.width / 2;
            const top = mode.y - mode.height / 2;
            const bottom = mode.y + mode.height / 2;
            if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) {
                this.gameModes.forEach(m => m.selected = false);
                mode.selected = true;
                this.selectedMode = mode.type;
                // Even if it was already visible, this line might be here:
                this.buttons[0].visible = true;
                this.render();
                return;
            }
        }

        // Check the main buttons.
        // for (let btn of this.buttons) {
        //     // Skip non-visible buttons.
        //     if (!btn.visible) continue;
        //     const left = btn.x - btn.width / 2;
        //     const right = btn.x + btn.width / 2;
        //     const top = btn.y - btn.height / 2;
        //     const bottom = btn.y + btn.height / 2;
        //     if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) {
        //         if (btn.text === "Start Game" && this.selectedMode) {
        //             // Call the start callback passing the selected mode.
        //             if (this.startCallback) this.startCallback(this.selectedMode);
        //         }
        //         return;
        //     }
        // }
        for (let btn of this.buttons) {
            if (!btn.visible) continue;
            
            if (mouseX >= btn.x && 
                mouseX <= btn.x + btn.width &&
                mouseY >= btn.y && 
                mouseY <= btn.y + btn.height) {
                if (btn.text === "Start Game" && this.selectedMode) {
                    this.startCallback(this.selectedMode);
                }
                return;
            }
        }
    }

    render() {
        const ctx = this.context;

        // button layout configs:
        const buttonWidth = 190;
        const buttonHeight = 50;
        const gap = 20;

        const totalWidth = this.buttons.length * buttonWidth + (this.buttons.length - 1) * gap;
        const startX = (this.canvas.width - totalWidth) / 2;
        const y = this.canvas.height - buttonHeight - 50; // 40px padding from bottom

        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background using assets
        const bg = this.assets.get("background");
        if (bg && bg.complete) {
            ctx.drawImage(bg, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            ctx.fillStyle = "#222";
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw title
        ctx.fillStyle = "#fff";
        ctx.font = "72px Montserrat";
        ctx.textAlign = "center";
        ctx.fillText("Piece Perfect", this.canvas.width / 2, 100);

        // Draw subtitle
        ctx.font = "24px Montserrat";
        ctx.fillText("Select your puzzle style", this.canvas.width / 2, 150);

        const cardImg = this.assets.get("card");

        // Draw game mode cards
        for (let mode of this.gameModes) {
            const left = mode.x - mode.width / 2;
            const top = mode.y - mode.height / 2;

            ctx.save();
            if (mode.selected) {
                ctx.shadowColor = 'grey';
                ctx.shadowBlur = 20;
                ctx.shadowOffsetY = 0;
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.roundRect(left, top, mode.width, mode.height, 32);
                ctx.stroke();
            }

            if (cardImg && cardImg.complete) {
                ctx.drawImage(cardImg, left, top, mode.width, mode.height);
            } else {
                ctx.fillStyle = "rgba(30, 30, 60, 0.8)";
                ctx.beginPath();
                ctx.roundRect(left, top, mode.width, mode.height, 20);
                ctx.fill();
            }

            ctx.restore();

            // Thumbnail
            let thumbKey = mode.type === "jigsaw" ? "jigsawThumb" : "gridThumb";
            const thumb = this.assets.get(thumbKey);

            if (thumb && thumb.complete) {
                const thumbHeight = mode.height * 0.6;
                const thumbWidth = thumbHeight * (thumb.width / thumb.height);
                ctx.drawImage(
                    thumb,
                    mode.x - thumbWidth / 2,
                    top + 20,
                    thumbWidth,
                    thumbHeight
                );
            }
            // Title
            ctx.fillStyle = "black";
            ctx.font = "15px Montserrat";
            ctx.textAlign = "center";
            ctx.fillText(mode.text, mode.x, top + mode.height * 0.7);

            // Description
            ctx.font = "14px Montserrat";
            const maxTextWidth = mode.width * 0.8;
            const lineHeight = 20;
            const startY = top + mode.height * 0.75;

            this.wrapText(
                ctx,
                mode.description,
                mode.x,
                startY,
                maxTextWidth,
                lineHeight
            );
        }

        // ctx.strokeStyle = 'red';
        // ctx.lineWidth = 2;
        // for (let btn of this.buttons) {
        //     ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
        // }

        for (let i = 0; i < this.buttons.length; i++) {
            const btn = this.buttons[i];

            btn.width = buttonWidth;
            btn.height = buttonHeight;
            btn.x = startX + i * (buttonWidth + gap);
            btn.y = y;

            const isHovered = this.hoveredButton === btn;
            drawButton(this.context, btn, isHovered, this.assets);
        }
    }
}

class ImageSelectMenu {
    // constructor(canvas, context, mode, startGameCallback, assets) {
    //     this.canvas = canvas;
    //     this.context = context;
    //     this.mode = mode;
    //     this.startGameCallback = startGameCallback;
    //     this.assets =assets;

    //     this.boundHandleClick = this.handleClick.bind(this);
    //     this.canvas.addEventListener("click", this.boundHandleClick);

    //     this.uploadedImage = null;

    //     //Load dynamically
    //     this.folderImageCount = 3;
    //     this.imageFolder = "IMG/pieces/";
    //     this.images = [];

    //     for (let i = 1; i <= this.folderImageCount; i++) {
    //         this.images.push({ 
    //             src: `${this.imageFolder}image${i}.jpg`, 
    //             label: `Image ${i}` 
    //         });
    //     }

    //     this.rows = 3;
    //     this.cols = 3;
        
    //     this.thumbnails = [];
    //     this.loadedCount = 0;

    //     // this.thumbWidth = 300;
    //     // this.thumbHeight = 180;
    //     // this.thumbGap = 40;

    //     this.thumbWidth = this.canvas.width * 0.22;
    //     this.thumbHeight = this.canvas.height * 0.25;
    //     this.thumbGap = this.canvas.width * 0.03;

    //     this.scrollOffset = 0;
    //     this.thumbnailScrollStep = 200; // pixels per scroll

    //     //upload button
    //     this.uploadButton = {
    //       x: 0, y: 0, width: 0, height: 0,
    //       label: "Upload Your Own"
    //     };
    //     this.uploadBtnX = this.canvas.width / 2 - 100;
    //     this.uploadBtnY = this.canvas.height - 100;
    //     this.uploadBtnW = 200;
    //     this.uploadBtnH = 50;
    //     enableButtonHoverTracking(this); // ✅ this uses this.buttons automatically

    //     this.setupUploadUI();
    //     this.setupGridSelectors();
    //     this.initThumbnails();  
    // }
   constructor(canvas, context, mode, startGameCallback, assets) {
        this.canvas = canvas;
        this.context = context;
        this.mode = mode;
        this.startGameCallback = startGameCallback;
        this.assets = assets;

        // Initialize buttons array
        this.buttons = [
            {
                x: 0, y: 0, width: 0, height: 0,
                label: "Upload Your Own",
                id: "upload-btn"
            }
        ];

        this.boundHandleClick = this.handleClick.bind(this);
        this.boundHandleWheel = this.handleWheel.bind(this);
        this.canvas.addEventListener("click", this.boundHandleClick);
        this.canvas.addEventListener("wheel", this.boundHandleWheel);

        this.uploadedImage = null;

        // Load more images for scrolling demonstration
        this.folderImageCount = 12; // Increased number of images
        this.imageFolder = "IMG/pieces/";
        this.images = [];

        for (let i = 1; i <= this.folderImageCount; i++) {
            this.images.push({ 
                src: `${this.imageFolder}image${i}.jpg`, 
                label: `Image ${i}`,
                id: `image-${i}`
            });
        }

        this.rows = 2;
        this.cols = 2;
        
        this.thumbnails = [];
        this.loadedCount = 0;

        // Thumbnail dimensions
        this.thumbWidth = 200;
        this.thumbHeight = 150;
        this.thumbGap = 20;
        
        // Scroll properties
        this.scrollOffset = 0;
        this.maxScrollOffset = 0;
        this.scrollSpeed = 25;
        this.isDragging = false;
        this.dragStartX = 0;
        this.startScrollOffset = 0;

        // Calculate how many thumbnails fit in view
        this.visibleThumbCount = Math.floor((canvas.width * 0.9) / (this.thumbWidth + this.thumbGap));

        // Upload button
        this.uploadButton = this.buttons[0]; // Reference the button from the buttons array
        this.uploadBtnX = this.canvas.width / 2 - 100;
        this.uploadBtnY = this.canvas.height - 100;
        this.uploadBtnW = 200;
        this.uploadBtnH = 50;
        
        // Initialize hover tracking after buttons are set up
        enableButtonHoverTracking(this);
        
        this.setupUploadUI();
        this.setupGridSelectors();
        this.initThumbnails();

        // For touch support
        this.boundHandleTouchStart = this.handleTouchStart.bind(this);
        this.boundHandleTouchMove = this.handleTouchMove.bind(this);
        this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
        this.canvas.addEventListener("touchstart", this.boundHandleTouchStart);
        this.canvas.addEventListener("touchmove", this.boundHandleTouchMove);
        this.canvas.addEventListener("touchend", this.boundHandleTouchEnd);
    }

    handleWheel(event) {
        event.preventDefault();
        this.scrollOffset += event.deltaY > 0 ? this.scrollSpeed : -this.scrollSpeed;
        this.clampScrollOffset();
        this.render();
    }

    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.isDragging = true;
        this.dragStartX = touch.clientX;
        this.startScrollOffset = this.scrollOffset;
    }

    handleTouchMove(event) {
        if (!this.isDragging) return;
        event.preventDefault();
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.dragStartX;
        this.scrollOffset = this.startScrollOffset - deltaX;
        this.clampScrollOffset();
        this.render();
    }

    handleTouchEnd() {
        this.isDragging = false;
    }

    clampScrollOffset() {
        const totalContentWidth = this.thumbnails.length * (this.thumbWidth + this.thumbGap);
        const maxScroll = totalContentWidth - (this.canvas.width * 0.9);
        this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset));
    }

    initThumbnails() {
        for (let imgData of this.images) {
            const img = new Image();
            img.src = imgData.src;
            img.onload = () => {
                this.loadedCount++;
                if (this.loadedCount === this.images.length) {
                    // Calculate max scroll offset after all images load
                    const totalWidth = this.thumbnails.length * (this.thumbWidth + this.thumbGap);
                    const visibleWidth = this.canvas.width * 0.9;
                    this.maxScrollOffset = Math.max(0, totalWidth - visibleWidth);
                }
                this.render();
            };
            this.thumbnails.push({ 
                ...imgData, 
                image: img,
                x: 0, // Will be set in render
                y: 0
            });
        }
    }

    destroy() {
        this.canvas.removeEventListener("click", this.boundHandleClick);
        this.canvas.removeEventListener("wheel", this.boundHandleWheel);
        this.canvas.removeEventListener("touchstart", this.boundHandleTouchStart);
        this.canvas.removeEventListener("touchmove", this.boundHandleTouchMove);
        this.canvas.removeEventListener("touchend", this.boundHandleTouchEnd);

        this.canvas.removeEventListener("mousemove", this._onMouseMove);

        this.rowSelect?.remove();
        this.colSelect?.remove();
        this.fileInput?.remove();

    }

    setupGridSelectors() {
        this.rowSelect = document.createElement("select");
        this.colSelect = document.createElement("select");

        [this.rowSelect, this.colSelect].forEach(select => {
            select.style.position = "absolute";
            select.style.top = `${this.canvas.height - 150}px`;
            select.style.fontSize = "18px";
            select.style.padding = "6px";
        });

        this.rowSelect.style.left = `${this.canvas.width / 2 - 100}px`;
        this.colSelect.style.left = `${this.canvas.width / 2 + 10}px`;

        for (let r = 2; r <= 8; r++) {
            const opt = document.createElement("option");
            opt.value = r;
            opt.textContent = `${r} rows`;
            if (r === 3) opt.selected = true;
            this.rowSelect.appendChild(opt);
        }

        for (let c = 2; c <= 8; c++) {
            const opt = document.createElement("option");
            opt.value = c;
            opt.textContent = `${c} cols`;
            if (c === 3) opt.selected = true;
            this.colSelect.appendChild(opt);
        }

        document.body.appendChild(this.rowSelect);
        document.body.appendChild(this.colSelect);

        this.rowSelect.addEventListener("change", () => {
            this.rows = parseInt(this.rowSelect.value);
        });

        this.colSelect.addEventListener("change", () => {
            this.cols = parseInt(this.colSelect.value);
        });
    }

    setupUploadUI() {
        this.fileInput = document.createElement("input");
        this.fileInput.type = "file";
        this.fileInput.accept = "image/*";
        this.fileInput.style.display = "none";

        this.fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                this.thumbnails.push({
                    src: url,
                    label: "Your Image",
                    image: (() => {
                        const img = new Image();
                        img.src = url;
                        img.onload = () => this.render();
                        return img;
                    })()
                });
                this.render();
            }
        });

        document.body.appendChild(this.fileInput);
    }

    // handleClick(event) {
    //     const rect = this.canvas.getBoundingClientRect();
    //     const x = (event.clientX - rect.left) * this.canvas.width / rect.width;
    //     const y = (event.clientY - rect.top) * this.canvas.height / rect.height;

    //     const startX = (this.canvas.width - (this.thumbWidth * this.thumbnails.length + this.thumbGap * (this.thumbnails.length - 1))) / 2;
    //     const yPos = this.canvas.height / 2;

    //     for (let i = 0; i < this.thumbnails.length; i++) {
    //         const xPos = startX + i * (this.thumbWidth + this.thumbGap);
    //         if (x >= xPos && x <= xPos + this.thumbWidth && y >= yPos && y <= yPos + this.thumbHeight) {
    //             this.canvas.removeEventListener("click", this.boundHandleClick);

    //             // this.startGameCallback(this.mode, this.thumbnails[i].src);
    //             // Remove grid selectors from DOM
    //             this.rowSelect.remove();
    //             this.colSelect.remove();

    //             // Launch game
    //             this.startGameCallback(this.mode, this.thumbnails[i].src, this.rows, this.cols);

    //             return;
    //         }
    //     }

    //     // Check if "Upload Your Own" button was clicked
    //     if (
    //         x >= this.uploadBtnX && x <= this.uploadBtnX + this.uploadBtnW &&
    //         y >= this.uploadBtnY && y <= this.uploadBtnY + this.uploadBtnH
    //     ) {
    //         this.fileInput.click(); // Trigger file chooser
    //         return;
    //     }
    // }
     handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        // Check thumbnails
        for (const thumb of this.thumbnails) {
            if (x >= thumb.x && x <= thumb.x + this.thumbWidth &&
                y >= thumb.y && y <= thumb.y + this.thumbHeight) {
                
                // this.canvas.removeEventListener("click", this.boundHandleClick);
                // this.rowSelect?.remove();
                // this.colSelect?.remove();

                this.destroy()
                this.startGameCallback(this.mode, thumb.src, this.rows, this.cols);
                return;
            }
        }

        // Check upload button
        if (x >= this.uploadBtnX && x <= this.uploadBtnX + this.uploadBtnW &&
            y >= this.uploadBtnY && y <= this.uploadBtnY + this.uploadBtnH) {
            this.fileInput.click();
        }
    }

    // render() {
    //     const ctx = this.context;
    //     ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    //     const bg = this.assets.get("background");
    //     if (bg && bg.complete) {
    //         ctx.drawImage(bg, 0, 0, this.canvas.width, this.canvas.height);
    //     } else {
    //         ctx.fillStyle = "#222";
    //         ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    //     }
       
    //     ctx.fillStyle = "#fff";
    //     ctx.font = "48px Arial";
    //     ctx.textAlign = "center";
    //     ctx.fillText("Choose a Picture", this.canvas.width / 2, 100);

    //     //thumbnails
    //     const startX = (this.canvas.width - (this.thumbWidth * this.thumbnails.length + this.thumbGap * (this.thumbnails.length - 1))) / 2;
    //     const yPos = this.canvas.height / 2;

    //     for (let i = 0; i < this.thumbnails.length; i++) {
    //         const imgObj = this.thumbnails[i];
    //         const x = startX + i * (this.thumbWidth + this.thumbGap);

    //         if (imgObj.image.complete) {
    //             ctx.drawImage(imgObj.image, x, yPos, this.thumbWidth, this.thumbHeight);
    //         }

    //         // ctx.fillStyle = "#fff";
    //         // ctx.font = "20px Arial";
    //         // ctx.fillText(imgObj.label, x + thumbWidth / 2, yPos + thumbHeight + 30);
    //     }

    //     //push uploadButton to buttons for auto hover effect
    //     this.buttons = [
    //       this.uploadButton,
    //       { label: "Start", action: "start" },
    //       { label: "Back", action: "back" }
    //     ];

    //     this.uploadButton.x = this.uploadBtnX;
    //     this.uploadButton.y = this.uploadBtnY;
    //     this.uploadButton.width = this.uploadBtnW;
    //     this.uploadButton.height = this.uploadBtnH;

    //     const isHovered = this.hoveredButton === this.uploadButton;
    //     drawButton(this.context, this.uploadButton, isHovered, this.assets);

    //     // ctx.fillStyle = "#444";
    //     // ctx.fillRect(this.uploadBtnX, this.uploadBtnY, this.uploadBtnW, this.uploadBtnH);

    //     // ctx.fillStyle = "#fff";
    //     // ctx.font = "20px Arial";
    //     // ctx.textAlign = "center";
    //     // ctx.fillText("Upload Your Own", this.canvas.width / 2, this.canvas.height - 65);
    // }
   render() {
        const ctx = this.context;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background
        const bg = this.assets.get("background");
        if (bg && bg.complete) {
            ctx.drawImage(bg, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            ctx.fillStyle = "#222";
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
       
        // Draw title
        ctx.fillStyle = "#fff";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Choose a Picture", this.canvas.width / 2, 80);

        // Calculate thumbnail area dimensions
        const thumbAreaWidth = this.canvas.width * 0.9;
        const thumbAreaX = (this.canvas.width - thumbAreaWidth) / 2;
        const thumbAreaY = this.canvas.height / 2 - this.thumbHeight / 2;

        // Create clipping region for thumbnails
        ctx.save();
        ctx.beginPath();
        ctx.rect(thumbAreaX, thumbAreaY - 20, thumbAreaWidth, this.thumbHeight + 40);
        ctx.clip();

        // Draw thumbnails with scroll offset
        let currentX = thumbAreaX - this.scrollOffset;
        
        for (let i = 0; i < this.thumbnails.length; i++) {
            const thumb = this.thumbnails[i];
            thumb.x = currentX;
            thumb.y = thumbAreaY;

            // Only draw if visible
            if (currentX + this.thumbWidth > thumbAreaX && currentX < thumbAreaX + thumbAreaWidth) {
                if (thumb.image.complete) {
                    // Draw thumbnail image
                    ctx.drawImage(thumb.image, currentX, thumbAreaY, this.thumbWidth, this.thumbHeight);
                    
                    // Draw border
                    ctx.strokeStyle = this.hoveredButton?.id === thumb.id ? "#fff" : "#666";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(currentX, thumbAreaY, this.thumbWidth, this.thumbHeight);
                } else {
                    // Placeholder if image not loaded
                    ctx.fillStyle = "#444";
                    ctx.fillRect(currentX, thumbAreaY, this.thumbWidth, this.thumbHeight);
                }
            }
            
            currentX += this.thumbWidth + this.thumbGap;
        }
        
        ctx.restore();

        // Draw scroll indicators if needed
        if (this.maxScrollOffset > 0) {
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            
            // Left arrow if can scroll left
            if (this.scrollOffset > 0) {
                ctx.beginPath();
                ctx.moveTo(thumbAreaX - 30, this.canvas.height/2);
                ctx.lineTo(thumbAreaX - 50, this.canvas.height/2 - 15);
                ctx.lineTo(thumbAreaX - 50, this.canvas.height/2 + 15);
                ctx.closePath();
                ctx.fill();
            }
            
            // Right arrow if can scroll right
            if (this.scrollOffset < this.maxScrollOffset) {
                ctx.beginPath();
                ctx.moveTo(thumbAreaX + thumbAreaWidth + 30, this.canvas.height/2);
                ctx.lineTo(thumbAreaX + thumbAreaWidth + 50, this.canvas.height/2 - 15);
                ctx.lineTo(thumbAreaX + thumbAreaWidth + 50, this.canvas.height/2 + 15);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Draw upload button
        this.uploadButton.x = this.uploadBtnX;
        this.uploadButton.y = this.uploadBtnY;
        this.uploadButton.width = this.uploadBtnW;
        this.uploadButton.height = this.uploadBtnH;

        const isHovered = this.hoveredButton?.id === "upload-btn";
        drawButton(ctx, this.uploadButton, isHovered, this.assets);
    }
}

// === WINDOW LOAD ENTRY ===
window.addEventListener("load", () => {

    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    
    // Set canvas size based on window height while maintaining aspect ratio
    // const targetHeight = window.innerHeight;
    // const targetWidth = targetHeight * (16/9); // Example 16:9 aspect ratio
    
    // canvas.width = Math.min(targetWidth, window.innerWidth);
    // canvas.height = targetHeight;
    function resizeCanvas() {
        const targetHeight = window.innerHeight;
        const targetWidth = targetHeight * (16 / 9); // Keep 16:9 ratio

        canvas.width = Math.min(targetWidth, window.innerWidth);
        canvas.height = targetHeight;

        if (currentScreen?.render) {
            currentScreen.render();
        }
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas(); // initial call

    const assets = new AssetManager();
        assets.load("background", "ui/bg.png");
        assets.load("button", "ui/btn.png");
        assets.load("card", "ui/btnbig.png");
        assets.load("jigsawThumb", "ui/jigsawThumpnail.png");
        assets.load("gridThumb", "ui/gridThumpnail.png");
        assets.load("wood", "IMG/grid/wood_1920.jpg");
        assets.load("textile", "IMG/grid/textile_1920.jpg")

    assets.whenDone(() => {
        startMainMenu();
    });

    currentScreen = new MainMenu(this.canvas, this.context, (selectedMode) => {
        currentScreen.destroy();
        currentScreen = new ImageSelectMenu(this.canvas, this.context, selectedMode, (mode, imagePath, rows, cols) => {
            currentScreen.destroy();
            currentScreen = new Game(this.canvas, this.context, imagePath, rows, cols, mode, this.assets);
        }, assets);
        currentScreen.render();
    }, assets); // <<<<< This is the fix

    function startMainMenu() {
        if (currentScreen && currentScreen.destroy) currentScreen.destroy();

        const mainMenu = new MainMenu(canvas, context, (selectedMode) => {
            if (currentScreen && currentScreen.destroy) currentScreen.destroy();

            const imageMenu = new ImageSelectMenu(canvas, context, selectedMode, (mode, imagePath, rows, cols) => {
                if (currentScreen && currentScreen.destroy) currentScreen.destroy();

                const game = new Game(canvas, context, imagePath, rows, cols, mode, assets);
                currentScreen = game; // optional for future game teardown
            }, assets);

            currentScreen = imageMenu;
            imageMenu.render();
        }, assets);

        currentScreen = mainMenu;
        mainMenu.render();
    }
});

