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

        // Animation tracking
        this.isMoving = false;
        this.currentFrame = 1;
        this.animationTimer = 0;
        this.animationSpeed = 90;
    }

    init() {
        console.log('Game scene init method started');
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

        console.log('Loading assets...');
    }

    create() {
        this._generateMaze();
        this._createBoard();
        this._createWalls();
        this._initializePlayer();
        this.cursors = this.input.keyboard.createCursorKeys();
        console.log('Game scene create - check for errors above');
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
        console.log('Initializing player...'); 

        const startX = Math.floor(this.BOARD_WIDTH / 2) * this.GRID_SIZE + this.GRID_SIZE / 2;
        const startY = Math.floor(this.BOARD_HEIGHT / 2) * this.GRID_SIZE + this.GRID_SIZE / 2;
        
        this.player = this.add.sprite(startX, startY, 'human_down');
        this.player.setDisplaySize(this.PLAYER_SIZE, this.PLAYER_SIZE);
        
        this.physics.add.existing(this.player);
        this.player.body.setSize(this.PLAYER_SIZE, this.PLAYER_SIZE);
        
        this.playerDirection = 'down';
        this.playerGridPos = {
            row: Math.floor(this.BOARD_HEIGHT / 2),
            col: Math.floor(this.BOARD_WIDTH / 2)
        }
        
        console.log('Player created at:', startX, startY);
    }

    update(time, delta) {
        this._handlePlayerInput(delta);
        this._handleWalkingAnimation(delta);
    }

    _handleWalkingAnimation(time) {
        if (this.isMoving) {
            this.animationTimer += time;
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

    _handlePlayerInput(delta) {
        const speed = 300;
        
        // Check if any input is pressed - FIX #3
        const hasInput = this.cursors.left.isDown || this.cursors.right.isDown || 
                         this.cursors.up.isDown || this.cursors.down.isDown;
        
        if (!hasInput) {
            this.player.body.setVelocity(0);
            this.isMoving = false;
            return;
        }
        
        // Store current position
        const oldX = this.player.x;
        const oldY = this.player.y;
        
        // Reset velocity
        this.player.body.setVelocity(0);
        
        let velocityX = 0;
        let velocityY = 0;
        let direction = null;

        // Check input and set desired velocity
        if (this.cursors.left.isDown) {
            velocityX = -speed;
            direction = 'left';
        } else if (this.cursors.right.isDown) {
            velocityX = speed;
            direction = 'right';
        }

        if (this.cursors.up.isDown) {
            velocityY = -speed;
            direction = 'up';
        } else if (this.cursors.down.isDown) {
            velocityY = speed;
            direction = 'down';
        }

        // Calculate potential new positions
        const moveDistance = speed * (delta / 1000);
        const testX = oldX + (velocityX !== 0 ? (velocityX > 0 ? moveDistance : -moveDistance) : 0);
        const testY = oldY + (velocityY !== 0 ? (velocityY > 0 ? moveDistance : -moveDistance) : 0);

        let moved = false;

        // Try diagonal movement first (both X and Y)
        if (velocityX !== 0 && velocityY !== 0) {
            if (this._checkWallCollision(testX, testY)) {
                this.player.body.setVelocity(velocityX, velocityY);
                moved = true;
            }
        }

        // If diagonal failed or only one direction pressed, try each axis independently from CURRENT position - FIX #2
        if (!moved) {
            if (velocityX !== 0 && this._checkWallCollision(testX, oldY)) {
                this.player.body.setVelocityX(velocityX);
                moved = true;
            }
            
            if (velocityY !== 0 && this._checkWallCollision(oldX, testY)) {
                this.player.body.setVelocityY(velocityY);
                moved = true;
            }
        }
        
        this.isMoving = moved;
        
        if (moved && direction) {
            this._changePlayerDirection(direction);
        }
    }

    _checkWallCollision(x, y) {
        // Get player bounds at the new position
        const halfSize = this.PLAYER_SIZE / 2;
        const playerLeft = x - halfSize;
        const playerRight = x + halfSize;
        const playerTop = y - halfSize;
        const playerBottom = y + halfSize;

        // Check board boundaries first
        if (playerLeft < 0 || playerRight > this.BOARD_WIDTH * this.GRID_SIZE ||
            playerTop < 0 || playerBottom > this.BOARD_HEIGHT * this.GRID_SIZE) {
            return false;
        }

        // Add small margin for floating point comparison
        const margin = 0.5;

        // Determine which cells the player overlaps
        const minCol = Math.max(0, Math.floor(playerLeft / this.GRID_SIZE));
        const maxCol = Math.min(this.BOARD_WIDTH - 1, Math.floor((playerRight - margin) / this.GRID_SIZE));
        const minRow = Math.max(0, Math.floor(playerTop / this.GRID_SIZE));
        const maxRow = Math.min(this.BOARD_HEIGHT - 1, Math.floor((playerBottom - margin) / this.GRID_SIZE));

        // Check walls in all overlapping cells - FIX #1
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                const walls = this.grid[row][col].walls;
                
                // Calculate cell boundaries (walls are ON these lines)
                const cellLeft = col * this.GRID_SIZE;
                const cellRight = (col + 1) * this.GRID_SIZE;
                const cellTop = row * this.GRID_SIZE;
                const cellBottom = (row + 1) * this.GRID_SIZE;

                // Check collision with each wall (walls are line segments)
                // Top wall - horizontal line at cellTop
                if (walls[0]) {
                    // Player crosses this horizontal wall if player spans across cellTop vertically
                    // AND overlaps the wall horizontally
                    if (playerTop <= cellTop + margin && playerBottom >= cellTop - margin &&
                        playerRight > cellLeft + margin && playerLeft < cellRight - margin) {
                        return false;
                    }
                }

                // Right wall - vertical line at cellRight
                if (walls[1]) {
                    // Player crosses this vertical wall if player spans across cellRight horizontally
                    // AND overlaps the wall vertically
                    if (playerLeft <= cellRight + margin && playerRight >= cellRight - margin &&
                        playerBottom > cellTop + margin && playerTop < cellBottom - margin) {
                        return false;
                    }
                }

                // Bottom wall - horizontal line at cellBottom
                if (walls[2]) {
                    // Player crosses this horizontal wall if player spans across cellBottom vertically
                    // AND overlaps the wall horizontally
                    if (playerTop <= cellBottom + margin && playerBottom >= cellBottom - margin &&
                        playerRight > cellLeft + margin && playerLeft < cellRight - margin) {
                        return false;
                    }
                }

                // Left wall - vertical line at cellLeft
                if (walls[3]) {
                    // Player crosses this vertical wall if player spans across cellLeft horizontally
                    // AND overlaps the wall vertically
                    if (playerLeft <= cellLeft + margin && playerRight >= cellLeft - margin &&
                        playerBottom > cellTop + margin && playerTop < cellBottom - margin) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    _changePlayerDirection(direction) {
        if (this.playerDirection !== direction) {
            this.playerDirection = direction;
            this.player.setTexture(`human_${direction}`);
            this.player.setDisplaySize(this.PLAYER_SIZE, this.PLAYER_SIZE);
        }
    }
}