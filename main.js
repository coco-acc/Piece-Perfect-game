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
        context.restore();
    }

    containsPoint(x, y) {
        return x > this.x && x < this.x + this.width && y > this.y && y < this.y + this.height;
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

    }

    // Call this whenever a piece is moved
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

    // applyState() {
    //     const state = this.history[this.historyIndex];
    //     state.forEach((pos, i) => {
    //         this.pieces[i].x = pos.x;
    //         this.pieces[i].y = pos.y;
    //     });
    //     this.render();
    // }

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
        // Save initial position when starting to drag
        this.saveState();
    }

    onMouseMove(event) {
        if (!this.draggingPiece) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const offsetX = (event.clientX - rect.left) * scaleX;
        const offsetY = (event.clientY - rect.top) * scaleY;
        
        // this.draggingPiece.x = offsetX - this.offsetX;
        // this.draggingPiece.y = offsetY - this.offsetY;

        // Keep piece within canvas bounds
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

    onMouseUp() {
        if (!this.draggingPiece) return;

        if (Math.abs(this.draggingPiece.x - this.draggingPiece.correctX) < 10 &&
            Math.abs(this.draggingPiece.y - this.draggingPiece.correctY) < 10) {
            this.draggingPiece.x = this.draggingPiece.correctX;
            this.draggingPiece.y = this.draggingPiece.correctY;
        }

         // Save final position
        this.saveState();

        this.draggingPiece = null;
        this.render();

        //vectory message
        if(this.checkVictory()) {
            this.showVictoryMessage();
        }
    }

    showVictoryMessage() {
        this.context.fillStyle = 'rgba(0,0,0,0.7)';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = 'white';
        this.context.font = '48px Arial';
        this.context.textAlign = 'center';
        this.context.fillText('Puzzle Complete!', 
            this.canvas.width/2, 
            this.canvas.height/2
        );
        this.context.fillText('🎉🎊 congratulations 🏆', 
            this.canvas.width/2, 
            this.canvas.height/2+ 100
        );
    }

    render() {
        // if (!this.needsRender) return;
        this.needsRender = false;
    
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw a background (optional)
        this.context.fillStyle = 'black';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw the pieces
        this.pieces.forEach(piece => piece.draw(this.context));

        // Draw grid lines
        this.context.strokeStyle = 'rgba(255,255,255,0.5)';
        for(let row = 1; row < this.rows; row++) {
            const y = this.drawY + row * (this.drawHeight/this.rows);
            this.context.beginPath();
            this.context.moveTo(this.drawX, y);
            this.context.lineTo(this.drawX + this.drawWidth, y);
            this.context.stroke();
        }
        for(let col = 1; col < this.cols; col++) {
            const x = this.drawX + col * (this.drawWidth/this.cols);
            this.context.beginPath();
            this.context.moveTo(x, this.drawY);
            this.context.lineTo(x, this.drawY + this.drawHeight);
            this.context.stroke();
        }
    }
}

window.addEventListener('load', () => {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 1920;
    canvas.height = 720;
    
    const game = new Game(canvas, context, 'IMG/puzzle-image.jpg', 1, 3);
});