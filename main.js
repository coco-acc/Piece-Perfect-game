function createJigsawPath(ctx, width, height, tabs) {
    const tabSize = Math.min(width, height) / 2.5;
    const bumpSize = Math.min(width, height) / 4; // Size of the bump

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
    constructor(canvas, context, imageSrc, rows, cols, mode) {
        this.canvas = canvas;
        this.canvas.width = this.canvas.width;
        this.canvas.height = this.canvas.height;
        this.context = context;
        this.imageSrc = imageSrc;
        this.rows = rows;
        this.cols = cols;
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

        //time tracking
        this.startTime = null;
        this.elapsedTime = 0; // in milliseconds
        this.timerInterval = null;
        this.isTimerRunning = false;

        this.gridImg = new Image();
        this.gridImg.src = ('IMG/wood_1920.jpg');

        // Padding above and below the grid
        this.topPadding = 40;
        this.bottomPadding = 20;
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
        } else {
            this.resumeTimer();
        }
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
        this.renderTimer(); // Update display
    }

    // updateTimer() {
    //     this.elapsedTime = Date.now() - this.startTime;
    //     this.renderTimer();
    // }
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

    loadImage() {
        this.image = new Image();
        this.image.src = this.imageSrc;
        this.image.onload = () => {
            // Calculate the aspect ratio and scale the image to fit canvas
            const canvasAspect = this.canvas.width / this.canvas.height;
            const imageAspect = this.image.width / this.image.height;
            
            let drawWidth, drawHeight;
            if (imageAspect > canvasAspect) {
                // Image is wider than canvas (relative to height)
                drawWidth = this.canvas.width;
                drawHeight = this.canvas.width / imageAspect;
            } else {
                // Image is taller than canvas (relative to width)
                drawHeight = this.canvas.height;
                drawWidth = this.canvas.height * imageAspect;
            }
            
            // Center the image on canvas
            // this.drawX = (this.canvas.width - drawWidth) / 2;
            // this.drawY = (this.canvas.height - drawHeight) / 2;
            // this.drawWidth = drawWidth;
            // this.drawHeight = drawHeight;

            // Adjust available height to exclude the padding
            const availableHeight = this.canvas.height - this.topPadding - this.bottomPadding;

            if (imageAspect > canvasAspect) {
                drawWidth = this.canvas.width;
                drawHeight = this.canvas.width / imageAspect;
            } else {
                drawHeight = availableHeight;
                drawWidth = availableHeight * imageAspect;
            }

            // Center horizontally, and start below topPadding
            this.drawX = (this.canvas.width - drawWidth) / 2;
            this.drawY = this.topPadding;  // Starts below the padding area
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
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.onTouchEnd());

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                this.undo();
            } else if (e.ctrlKey && e.key === 'y') {
                this.redo();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'p') {
                this.togglePause();
            } else if (e.key === 'r') {
                this.resumeTimer();
            }
        });
    }

    onTouchStart(e) {
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
        // this.context.fillStyle = '#333'; 
        
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
        this.context.strokeStyle = 'white';  // Customize boundary color.
        this.context.lineWidth = 3;            // Customize boundary thickness.
        this.context.strokeRect(this.drawX, this.drawY, this.drawWidth, this.drawHeight);
        
        // Restore previous context settings.
        this.context.restore();
    }

    showVictoryMessage() {
        this.pauseTimer(); // Stop timer when puzzle is complete

        this.context.fillStyle = 'rgba(0,0,0,0.7)';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = 'white';
        this.context.font = '48px Arial';
        this.context.textAlign = 'center';
        this.context.fillText('Puzzle Complete!', 
            this.canvas.width/2, 
            this.canvas.height/2
        );

        // draw timer
        this.context.fillText(`In ${this.formatTime(this.elapsedTime)}`, 
            this.canvas.width/2, 
            this.canvas.height/2 + 100
        );

        this.context.fillText('🎉🎊 congratulations 🏆', 
            this.canvas.width/2, 
            this.canvas.height/2+ 150
        );
    }

    render() {
        // if (!this.needsRender) return;
        this.needsRender = false;
    
        // Clear the entire canvas.
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw a global background.
        this.context.fillStyle = 'black';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
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

class MainMenu {
    constructor(canvas, context, startCallback) {
        this.canvas = canvas;
        this.context = context;
        this.startCallback = startCallback;

        // Bind the click handler once and store its reference.
        this.boundHandleClick = this.handleClick.bind(this);
        this.canvas.addEventListener("click", this.boundHandleClick);

        this.selectedMode = null; //jigsaw or grid
        this.imagesLoaded = false;
        this.imagesToLoad = 4; // Number of images we need to load
        this.imagesLoadedCount = 0;

        // Load images with callbacks
        this.bgImg = new Image();
        this.bgImg.onload = () => this.imageLoaded();
        this.bgImg.src = "ui/bg.png";
        // this.bgImg.src = bgImageUrl;
        
        this.buttonImg = new Image();
        this.buttonImg.onload = () => this.imageLoaded();
        this.buttonImg.src = "ui/btn.png";
        
        this.jigsawThumbnail = new Image();
        // this.jigsawThumbnail.src = "ui/jigsaw_thumb.png";
        this.jigsawThumbnail.onload = () => this.imageLoaded();
        this.jigsawThumbnail.src = "ui/jigsawThumpnail.png";

        this.gridThumbnail = new Image();
        // this.gridThumbnail.src = "ui/grid_thumb.png";
        this.gridThumbnail.onload = () => this.imageLoaded();
        this.gridThumbnail.src = "ui/gridThumpnail.png";

        this.cardImg = new Image();
        this.cardImg.src = "ui/btnbig.png";

        // Main buttons
        this.buttons = [
            {                             
                text: "Start Game",
                x: (canvas.width / 2) - 220,
                y: canvas.height / 1.12,
                width: 190,
                height: 50,
                visible: true // Initially hidden until mode is selected
            },                                
            {                             
                text: "Options",
                x: canvas.width / 2,
                y: canvas.height / 1.12,
                width: 190,
                height: 50
            },                                
            {                             
                text: "Help",
                x: (canvas.width / 2) + 220,
                y: canvas.height / 1.12,
                width: 190,
                height: 50
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

    imageLoaded() {
        this.imagesLoadedCount++;
        if (this.imagesLoadedCount >= this.imagesToLoad) {
            this.imagesLoaded = true;
            this.render(); // Render when all images are loaded
        }
    }

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
        for (let btn of this.buttons) {
            // Skip non-visible buttons.
            if (!btn.visible) continue;
            const left = btn.x - btn.width / 2;
            const right = btn.x + btn.width / 2;
            const top = btn.y - btn.height / 2;
            const bottom = btn.y + btn.height / 2;
            if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) {
                if (btn.text === "Start Game" && this.selectedMode) {
                    // Call the start callback passing the selected mode.
                    if (this.startCallback) this.startCallback(this.selectedMode);
                }
                return;
            }
        }
    }

    render() {
        // Clear canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background if loaded
        if (this.bgImg.complete && this.bgImg.naturalHeight !== 0) {
            this.context.drawImage(this.bgImg, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Fallback background
            this.context.fillStyle = "#222";
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw title
        this.context.fillStyle = "#fff";
        this.context.font = "72px Montserrat";
        this.context.textAlign = "center";
        this.context.fillText("Piece Perfect", this.canvas.width / 2, 100);

        // Draw subtitle
        this.context.font = "24px Montserrat";
        this.context.fillText("Select your puzzle style", this.canvas.width / 2, 150);

        // Draw game mode cards
        for (let mode of this.gameModes) {
            const left = mode.x - mode.width / 2;
            const top = mode.y - mode.height / 2;
            
            // Card background
            this.context.save();
            if (mode.selected) {
                this.context.shadowColor = 'grey';
                this.context.shadowBlur = 20;
                this.context.shadowOffsetY = 0;
                // this.context.fillStyle = "rgba(50, 50, 80, 0.8)";

                this.context.strokeStyle = 'white';
                this.context.lineWidth = 4;
                this.context.beginPath();
                this.context.roundRect(left, top, mode.width, mode.height, 32);
                this.context.stroke();
            } 
            // else {
                // this.context.fillStyle = "rgba(30, 30, 60, 0.8)";
            // }
            
            // this.context.beginPath();
            // this.context.roundRect(left, top, mode.width, mode.height, 20);
            // this.context.fill();
            this.context.drawImage(this.cardImg, left, top, mode.width, mode.height);
            this.context.restore();
            
            // Card border
            // this.context.strokeStyle = mode.selected ? "white" : "#555";
            // this.context.lineWidth = mode.selected ? 4 : 2;
            // this.context.beginPath();
            // this.context.roundRect(left, top, mode.width, mode.height, 20);
            // this.context.stroke();

            // Thumbnail image - only draw if loaded
            const thumb = mode.type === 'jigsaw' ? this.jigsawThumbnail : this.gridThumbnail;
            if (thumb.complete && thumb.naturalHeight !== 0) {
                const thumbHeight = mode.height * 0.6;
                const thumbWidth = thumbHeight * (thumb.width / thumb.height);
                this.context.drawImage(
                    thumb,
                    mode.x - thumbWidth/2,
                    top + 20,
                    thumbWidth,
                    thumbHeight
                );
            }

            // Mode title
            this.context.fillStyle = "black";
            this.context.font = "15px Montserrat";
            this.context.textAlign = "center";
            this.context.fillText(mode.text, mode.x, top + mode.height * 0.7);

            // Mode description with wrapping
            this.context.font = "14px Montserrat";
            this.context.textAlign = "center";
            const maxTextWidth = mode.width * 0.8;
            const lineHeight = 20;
            const startY = top + mode.height * 0.75;
            
            this.wrapText(
                this.context, 
                mode.description, 
                mode.x, 
                startY, 
                maxTextWidth, 
                lineHeight
            );
        }

        // Draw buttons - only draw button image if loaded
        for (let btn of this.buttons) {
            if (!btn.visible && btn.text === "Start Game") continue;
            
            const left = btn.x - btn.width / 2;
            const top = btn.y - btn.height / 2;

            if (this.buttonImg.complete && this.buttonImg.naturalHeight !== 0) {
                this.context.drawImage(this.buttonImg, left, top, btn.width, btn.height);
            } else {
                // Fallback button appearance
                this.context.fillStyle = "#555";
                this.context.beginPath();
                this.context.roundRect(left, top, btn.width, btn.height, 10);
                this.context.fill();
            }

            this.context.fillStyle = "#fff";
            this.context.font = "24px Montserrat";
            this.context.textAlign = "center";
            this.context.fillText(btn.text, btn.x, btn.y + 8);
        }
    }
}


// window.addEventListener('load', () => {
//     const canvas = document.getElementById('canvas');
//     const context = canvas.getContext('2d');
//     canvas.width = window.innerWidth;
//     canvas.height = window.innerHeight;
    
//     // Create an instance of the MainMenu.
//     const mainMenu = new MainMenu(canvas, context, () => {
//         // This callback is called when "Start Game" is clicked.
//         // Remove or hide the menu and initialize the game.
//         // For instance, clear the menu event listeners if needed.
//         canvas.removeEventListener("click", mainMenu.handleClick);
        
//         // Create your Game instance (using your existing Game class).
//         const game = new Game(canvas, context, "IMG/pirates_1920.jpg", 6, 5);
//         // Optionally, start an animation loop or call game.render() periodically.
//     });

//       // Render the main menu.
//       // You could also set up an animation loop if your menu needs to be continuously updated.
//     mainMenu.render();
// });
window.addEventListener('load', () => {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const mainMenu = new MainMenu(canvas, context, (selectedMode) => {
        // Remove the click listener for the main menu using the stored reference.
        canvas.removeEventListener("click", mainMenu.boundHandleClick);
        // Now start your game.
        const game = new Game(canvas, context, "IMG/pirates_1920.jpg", 5, 6, selectedMode);
        // Optionally, start your game loop here.
    });

    mainMenu.render();
});


