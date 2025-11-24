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

    preload() {
        this.load.image('background', '/assets/Board/grass_patch_1.png');
        
        // Load all human walking frames
        for (let i = 1; i <= 6; i++) {
            this.load.image(`human_frame_${i}`, `/assets/Human/human_${i}.png`);
        }
       
        // Load directional resting images
        this.load.image('human_down', '/assets/Human/human_1.png'); 
        this.load.image('human_up', '/assets/Human/human_3.png');
        this.load.image('human_left', '/assets/Human/human_2.png');
        this.load.image('human_right', '/assets/Human/human_1.png');
    }

    create() {
        this._generateMaze();
        this._createBoard();
        this._createWalls();
        this._initializePlayer();
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    _generateMaze() {
        this.mazeGenerator = new MazeGenerator(this.BOARD_HEIGHT, this.BOARD_WIDTH, this.GRID_SIZE);
        this.grid = this.mazeGenerator.generateMaze(0, 0);
        this.wallManager = new WallManager(this, this.grid, this.GRID_SIZE);
    }

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

    _createWalls() {
        this.wallManager.createWalls();
    }

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

    update(time, delta) {
        this._handlePlayerInput();
        this._updatePlayerMovement(delta);
        this._handleWalkingAnimation(delta);
    }

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

    _isValidMove(fromRow, fromCol, toRow, toCol) {
        // Check if target is within grid bounds
        if (toRow < 0 || toRow >= this.BOARD_HEIGHT || 
            toCol < 0 || toCol >= this.BOARD_WIDTH) {
            return false;
        }

        // Use WallManager to check if movement is allowed
        return this.wallManager.canMoveFromTo(fromRow, fromCol, toRow, toCol);
    }

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

    _changePlayerDirection(direction) {
        if (this.playerDirection !== direction) {
            this.playerDirection = direction;
            this.player.setTexture(`human_${direction}`);
            this.player.setDisplaySize(this.PLAYER_SIZE, this.PLAYER_SIZE);
        }
    }
}