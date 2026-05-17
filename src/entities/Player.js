import Phaser from "phaser";
import MazeGenerator from "../maze/MazeGenerator";
import WallManager from "../maze/WallManager";

export default class Player {
    constructor(scene, gridSize, playerSize, wallManager) {
        this.scene = scene;
        this.GRID_SIZE = gridSize;
        this.PLAYER_SIZE = playerSize;
        this.wallManager = wallManager;

         // Grid-based movement
        this.isMoving = false;
        this.moveSpeed = 450; // pixels per second
        this.targetPosition = null;
        this.playerGridPos = { row: 0, col: 0 };
        this.playerDirection = 'down'
        this.walkCycleCounter = 0;
        this.lastMoveDirection = 'down';

    }
    
    /**
     * Places the player on the grid and sets their initial direction.
     */
    _initializePlayer() {
        // Start player in the middle of the grid
        this.playerGridPos = {
            row: 14,
            col: 0
        };
        
        const startX = this.playerGridPos.col * this.GRID_SIZE + this.GRID_SIZE / 2;
        const startY = this.playerGridPos.row * this.GRID_SIZE + this.GRID_SIZE / 2;
        
        this.player = this.scene.add.sprite(startX, startY, 'human_front_still');
        this.player.setDisplaySize(this.PLAYER_SIZE, this.PLAYER_SIZE);
        
        this.playerDirection = 'down';
        this.targetPosition = { x: startX, y: startY };
    }

    /**
     * Reads arrow key input and initiates player movement if the target cell is valid.
     * @returns {void}
     */
    _handlePlayerInput() {
        // stop movement if game is over
        if (this.scene.gameOver) return;
        
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
        if (!direction|| !this.scene._isValidMove(
            this.playerGridPos.row, 
            this.playerGridPos.col, 
            newRow, 
            newCol)) 
            {
            return;
        }

        if (direction && this.scene._isValidMove(
            this.playerGridPos.row, 
            this.playerGridPos.col, 
            newRow, 
            newCol)) {
            // RECORD
            const fromRow = this.playerGridPos.row;
            const fromCol = this.playerGridPos.col;
            this.scene.recorder.recordMove(
                'human', direction, fromRow, fromCol, newRow, newCol,
                (Date.now() - this.scene.recorder.startTime) / 1000
            )
        }

        // Update direction and start movement
        this._changePlayerDirection(direction);
        this._startMovement(newRow, newCol);
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

        this._advanceWalkFrame();
    }
    
    update(delta) {
        this._updatePlayerMovement(delta);
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
     * Cycles throught the walk frame every time a new movement is started
     * Called from _StartMovement()
     */
    _advanceWalkFrame() {
        // only advance if the direction hasn't changed
        if (this.playerDirection === this.lastMoveDirection) {
            this.walkCycleCounter++;
        } else {
            // direction changed; therefore reset
            this.walkCycleCounter = 0;
            this.lastMoveDirection = this,this.playerDirection;
        }

        // Now set the correct texture based on direction & counter
        this._updateWalkTexture();
    }

    /**
     * Sets the oakyer sprite to the correct walk frame or idle texture
     */
    _updateWalkTexture() {
        if (this.isMoving) {
            let textureKey;
            switch (this.playerDirection) {
                case 'up':
                    // two frames 
                    textureKey = `human_up_${(this.walkCycleCounter % 2) + 1}`;
                    break;
                case 'down':
                    textureKey = `human_down_${(this.walkCycleCounter % 2) + 1}`;
                    break;
                case 'left':
                    textureKey = `human_left_${(this.walkCycleCounter % 3) + 1}`;
                    break;
                case 'right':
                    textureKey = `human_right_${(this.walkCycleCounter % 3) + 1}`;
                    break;
            }
            this.player.setTexture(textureKey);
            this.player.setDisplaySize(this.PLAYER_SIZE, this.PLAYER_SIZE);
        } else {
            this._setIdleFrame();
        }
    }

    /**
     * Sets the idle sprite based on the last direction moved
     */
    _setIdleFrame() {
        let idleKey;
        switch (this.playerDirection) {
            case 'up':
                idleKey = 'human_back_still';
                break;
            case 'down':
                idleKey = 'human_front_still';
                break;
            case 'left':
                idleKey = 'human_left_1';
                break;
            case 'right':
                idleKey = 'human_right_1';
                break;
        }
        this.player.setTexture(idleKey);
        this.player.setDisplaySize(this.PLAYER_SIZE, this.PLAYER_SIZE);
    }

    /**
     * Updates the player's facing direction and swaps the the matching idle sprite.
     * @param {string} direction - Direction in which the player is now facing: 'up', 'down', 'left' or 'right'.
     * @returns {void}
     */
    _changePlayerDirection(direction) {
        if (this.playerDirection !== direction) {
            this.playerDirection = direction;
        }
    }
}