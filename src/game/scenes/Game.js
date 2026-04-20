import Phaser from "phaser";
import MazeGenerator from "../../maze/MazeGenerator";
import WallManager from "../../maze/WallManager";

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
        
        // Game constants
        this.GRID_SIZE = 60;
        this.BOARD_WIDTH = 15;
        this.BOARD_HEIGHT = 15;
        this.PLAYER_SIZE = this.GRID_SIZE - 20;
        
        // Game objects
        this.player = null;
        this.cursors = null;
        this.mazeGenerator = null;
        this.wallManager = null;
        this.grid = null;

        // Grid-based movement
        this.isMoving = false;
        this.moveSpeed = 300; // pixels per second
        this.targetPosition = null;
        this.playerGridPos = { row: 0, col: 0 };
        
        // Animation
        this.currentFrame = 1;
        this.animationTimer = 0;
        this.animationSpeed = 90;
    }

    /**
     * Preloads all assets needed for the game scene before it starts.
     * @returns {void}
     */
    preload() {
        this.load.image('background', '/assets/Board/grass_patch_1.png');
        
        for (let i = 1; i <= 6; i++) {
            this.load.image(`human_frame_${i}`, `/assets/Human/human_${i}.png`);
        }
       
        this.load.image('human_down', '/assets/Human/human_1.png'); 
        this.load.image('human_up', '/assets/Human/human_3.png');
        this.load.image('human_left', '/assets/Human/human_2.png');
        this.load.image('human_right', '/assets/Human/human_1.png');
    }

    /**
     * Creates and initializes all game objects when the scene starts.
     * @returns {void}
     */
    create() {
        this._generateMaze();
        this._createBoard();
        this._createWalls();
        this._initializePlayer();
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    /**
     * Instantiates the MazeGenerator and WallManager and generates the grid.
     * @returns {void}
     */
    _generateMaze() {
        this.mazeGenerator = new MazeGenerator(this.BOARD_HEIGHT, this.BOARD_WIDTH, this.GRID_SIZE);
        this.grid = this.mazeGenerator.generateMaze(0, 0);
        this.wallManager = new WallManager(this, this.grid, this.GRID_SIZE);
    }

    /**
     * Tiles background images across every cell of the board.
     * @returns {void}
     */
    _createBoard() {
        for (let row = 0; row < this.BOARD_HEIGHT; row++) {
            for (let col = 0; col < this.BOARD_WIDTH; col++) {
                const x = col * this.GRID_SIZE + this.GRID_SIZE / 2;
                const y = row * this.GRID_SIZE + this.GRID_SIZE / 2;
                const bg = this.add.image(x, y, 'background');
                bg.setDisplaySize(this.GRID_SIZE, this.GRID_SIZE);
            }
        }
    }

    /**
     * Delegates wall rendering to the WallManager.
     * @returns {void}
     */
    _createWalls() {
        this.wallManager.createWalls();
    }

    /**
     * Places the player on the grid and sets their initial direction.
     */
    _initializePlayer() {
        // Start player in the middle of the grid
        this.playerGridPos = {
            row: Math.floor(this.BOARD_HEIGHT / 2),
            col: Math.floor(this.BOARD_WIDTH / 2)
        };
        
        const startX = this.playerGridPos.col * this.GRID_SIZE + this.GRID_SIZE / 2;
        const startY = this.playerGridPos.row * this.GRID_SIZE + this.GRID_SIZE / 2;
        
        this.player = this.add.sprite(startX, startY, 'human_down');
        this.player.setDisplaySize(this.PLAYER_SIZE, this.PLAYER_SIZE);
        
        this.playerDirection = 'down';
        this.targetPosition = { x: startX, y: startY };
    }

    /**
     * Main game loop called every frame by Phase.
     * @param {*} time - Total elapsed time in milliseconds.
     * @param {*} delta - Time in milliseconds since the last frame.
     * @returns {void}
     */
    update(time, delta) {
        this._handlePlayerInput();
        this._updatePlayerMovement(delta);
        this._handleWalkingAnimation(delta);
    }

    /**
     * Reads arrow key input and initiates player movement if the target cell is valid.
     * @returns {void}
     */
    _handlePlayerInput() {
        // Only process input if not currently moving
        if (this.isMoving) return;

        let newRow = this.playerGridPos.row;
        let newCol = this.playerGridPos.col;
        let direction = null;

        if (this.cursors.left.isDown) {
            newCol--;
            direction = 'left';
        } else if (this.cursors.right.isDown) {
            newCol++;
            direction = 'right';
        } else if (this.cursors.up.isDown) {
            newRow--;
            direction = 'up';
        } else if (this.cursors.down.isDown) {
            newRow++;
            direction = 'down';
        }

        // If no direction pressed or invalid move, return
        if (!direction || !this._isValidMove(this.playerGridPos.row, this.playerGridPos.col, newRow, newCol)) {
            return;
        }

        // Update direction and start movement
        this._changePlayerDirection(direction);
        this._startMovement(newRow, newCol);
    }

    /**
     * Checks whether a move between two cells is within bounds and not bloacked by a wall.
     * @param {number} fromRow - Row index of the current cell. 
     * @param {*} fromCol - Column index of the current cell.
     * @param {*} toRow - Row index of the destination cell.
     * @param {*} toCol - Column index of the destination cell.
     * @returns {boolean} True if the move is allowed, false otherwise.
     */
    _isValidMove(fromRow, fromCol, toRow, toCol) {
        // Check if target is within grid bounds
        if (toRow < 0 || toRow >= this.BOARD_HEIGHT || 
            toCol < 0 || toCol >= this.BOARD_WIDTH) {
            return false;
        }

        // Use WallManager to check if movement is allowed
        return this.wallManager.canMoveFromTo(fromRow, fromCol, toRow, toCol);
    }

    /**
     * Commits the palyer to moving toward a target grid cell and calculates the pixel destination.
     * @param {number} targetRow - Row index of the destination cell.
     * @param {number} targetCol - Column index of the destination cell.
     * @returns {void}
     */
    _startMovement(targetRow, targetCol) {
        this.isMoving = true;
        this.playerGridPos.row = targetRow;
        this.playerGridPos.col = targetCol;
        
        // Calculate target pixel position (center of target cell)
        this.targetPosition = {
            x: targetCol * this.GRID_SIZE + this.GRID_SIZE / 2,
            y: targetRow * this.GRID_SIZE + this.GRID_SIZE / 2
        };
    }

    /**
     * Smoothly moves the player sprite toward the target pixel position each frame.
     * @param {*} delta - Time in milliseconds since the last frame.
     * @returns {void}
     */
    _updatePlayerMovement(delta) {
        if (!this.isMoving) return;

        const speed = this.moveSpeed * (delta / 1000);
        const dx = this.targetPosition.x - this.player.x;
        const dy = this.targetPosition.y - this.player.y;
        
        // Calculate distance to target
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= speed) {
            // Snap to target position
            this.player.x = this.targetPosition.x;
            this.player.y = this.targetPosition.y;
            this.isMoving = false;
        } else {
            // Move toward target
            const ratio = speed / distance;
            this.player.x += dx * ratio;
            this.player.y += dy * ratio;
        }
    }

    /**
     * Cycles through walking frames while the palyer is moving, or resets to a directional idle sprite when stopped.
     * @param {*} delta - Time in milliseconds since last frame
     * @returns {void}
     */
    _handleWalkingAnimation(delta) {
        if (this.isMoving) {
            this.animationTimer += delta;
            if (this.animationTimer >= this.animationSpeed) {
                this.animationTimer = 0;
                this.currentFrame = (this.currentFrame % 6) + 1;
                this.player.setTexture(`human_frame_${this.currentFrame}`);
                this.player.setDisplaySize(this.PLAYER_SIZE, this.PLAYER_SIZE);
            }
        } else {
            if (this.currentFrame !== 0) {
                this.currentFrame = 0;
                this.player.setTexture(`human_${this.playerDirection}`);
                this.player.setDisplaySize(this.PLAYER_SIZE, this.PLAYER_SIZE);
            }
        }
    }

    /**
     * Updates the player's facing direction and swaps the the matching idle sprite.
     * @param {string} direction - Direction in which the player is now facing: 'up', 'down', 'left' or 'right'.
     * @returns {void}
     */
    _changePlayerDirection(direction) {
        if (this.playerDirection !== direction) {
            this.playerDirection = direction;
            this.player.setTexture(`human_${direction}`);
            this.player.setDisplaySize(this.PLAYER_SIZE, this.PLAYER_SIZE);
        }
    }
}