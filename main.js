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

    // draw(context) {
    //     context.drawImage(this.image, this.x, this.y, this.width, this.height);
    // }
    draw(context) {
        context.save();
        if (this.dragging) {
            context.shadowColor = 'rgba(0,0,0,0.5)';
            context.shadowBlur = 10;
            context.shadowOffsetY = 5;
        }
        context.drawImage(this.image, this.x, this.y, this.width, this.height);

        // Draw highlight if active
        if (this.isHighlighted) {
            this.highlightEffects.pulsePhase += 0.1;
            const pulseAlpha = (0.3 + (Math.sin(this.highlightEffects.pulsePhase)) * 0.2);
            context.save();
            context.strokeStyle = `rgba(255, 255, 0, ${pulseAlpha})`;
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
    constructor(canvas, context, imageSrc, rows, cols) {
        this.canvas = canvas;
        this.context = context;
        this.imageSrc = imageSrc;
        this.rows = rows;
        this.cols = cols;
        this.pieces = [];
        this.draggingPiece = null;
        this.offsetX = 0;
        this.offsetY = 0;
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

    // renderTimer() {
    //     this.context.clearRect(10, 10, 150, 40);
    //     // Clear previous timer area
    //     this.context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    //     this.context.fillRect(10, 10, 120, 40);
        
    //     // Draw timer text
    //     this.context.fillStyle = 'white';
    //     this.context.font = '24px Arial';
    //     this.context.textAlign = 'left';
    //     this.context.fillText(`Time: ${this.formatTime(this.elapsedTime)}`, 20, 35);
    // }

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
            this.drawX = (this.canvas.width - drawWidth) / 2;
            this.drawY = (this.canvas.height - drawHeight) / 2;
            this.drawWidth = drawWidth;
            this.drawHeight = drawHeight;
            
            this.createPieces();
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
                this.pieces.push(piece);
            }
        }

        this.addEventListeners();
        // this.startTimer(); // Start timer when pieces are created
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
            if (e.ctrlKey && e.key === 'p') {
                this.togglePause();
            } else if (e.ctrlKey && e.key === 'r') {
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
                const offset = 10; // adjust as needed
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
        // Customize this color as needed.
        this.context.fillStyle = '#333'; 
        
        // Fill the grid area.
        this.context.fillRect(this.drawX, this.drawY, this.drawWidth, this.drawHeight);
        
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

window.addEventListener('load', () => {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 1920;
    canvas.height = 720;
    
    const game = new Game(canvas, context, 'IMG/puzzle-image.jpg', 3, 3);

    function animate() {

    }
});