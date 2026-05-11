import Phaser from "phaser";

export default class Zombie {
    /**
     * @param {Phaser.Scene} scene - required by phaser
     * @param {number} gridSize - size of one grid cell in pixels
     * @param {number} zombieSize - wifth/height of the zombie sprite
     * @param {object} wallManager - provides canMoveToFromTo info
     * @param {object} mazeGenerator - provides getNeighbors(row,col) for fallback
     */
    constructor(scene, gridSize, zombieSize, wallManager, mazeGenerator) {
        this.scene = scene;
        this.gridSize = gridSize;
        this.zombieSize = zombieSize;
        this.wallManager = wallManager;
        this.mazeGenerator = mazeGenerator;
        this.currentDirection = 'down';

        // Qtable data 
        this.qTable = null
        this.epsilon = 0;

        // Grid-based movement
        this.sprite = null;
        this.zombieGridPos = { row: 0, col: 0}
        this.isMoving = false;
        this.targetPosition = {x: 0, y: 0};
        this.moveDirection = {x: 0, y: 0};
        this.speed = 400; // pixels per second
        this.lastAnimDirection = 'down';

        // Animation
        this.walkFrame = 1;
        this.walkTimer = 0;
        this.walkInterval = 32;
    }

    /** 
     * Load the qtable from local json file
     * @returns {Promise<void>}
     */
    async initQTable() {
        try {
            const response = await fetch('qtable.json');
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            const data = await response.json();

            if (data.q_table) {
                this.qTable = data.q_table;
                if (data.epsilon != undefined) {
                    this.epsilon = data.epsilon;
                }
            } else {
                this.qTable = data;
            }
            console.log('QTable loaded successfully.');
        } catch (error) {
            throw new Error(
                `Cannot start game - Q-Table file is missing or corrupt.\n${error.message}`
            );
        }
    }

    /**
     * Places Zombie on grid, typically at opposite corner of human
     * @param {number} row - Starting row.
     * @param {number} col - Starting col.
     */
    initializeZombie(row, col) {
        this.zombieGridPos.row = row;
        this.zombieGridPos.col = col;
        
        const startX = col * this.gridSize + this.gridSize / 2;
        const startY = row * this.gridSize + this.gridSize / 2;


        this.sprite = this.scene.add.sprite(startX,startY, 'zombie_down');
        this.sprite.setDisplaySize(this.zombieSize, this.zombieSize);
        this.sprite.setDepth(10);
    }

    /**
     * Main AI update - qtable lookup
     * @param {number} delta - Time in milliseconds since the last frame.
     * @param {{row: number, col: number}} playerGridPos - The human's current grid position
     * @param {number} collectedKeys - how many keys the human has picked up
     */
    updateAI(delta, playerGridPos, collectedKeys) {
        if (this.isMoving) {
            this._updateMovement(delta);
            this._handleWalkingAnimation(delta);
            return;
        }

        // recreating python's _state_to_key()
        const stateKey = this._buildStateKey(
            this.zombieGridPos.row,
            this.zombieGridPos.col,
            collectedKeys
        );

        const action = this._qAction(stateKey);

        let dRow = 0, dCol = 0;
        switch (action) {
            case 0: dRow = -1; break; // up
            case 1: dCol = 1; break; // right
            case 2: dRow = 1; break; // down
            case 3: dCol = -1; break; // left
        }
        
        const targetRow = this.zombieGridPos.row + dRow;
        const targetCol = this.zombieGridPos.col + dCol;

        const GRID_ROWS = 15;
        const GRID_COLS = 15;

        if (targetRow < 0 || targetRow >= GRID_ROWS || targetCol < 0 || targetCol >= GRID_COLS) {
            const neighbors = this._getNeighbors(
                this.zombieGridPos.row, this.zombieGridPos.col
            );

            if (neighbors.length > 0) {
                const [r,c] = neighbors[Math.floor(Math.random() * neighbors.length)];
                this._startMovement(r,c);
            }
            return;
        }

        // validate move
        if (this.wallManager.canMoveFromTo(
            this.zombieGridPos.row, 
            this.zombieGridPos.col, 
            targetRow, targetCol)
        ) {
            this._startMovement(targetRow, targetCol);
        } else {
            // fallback choose rand()
            const neighbors = this._getNeighbors(
                this.zombieGridPos.row, this.zombieGridPos.col
            );
            if (neighbors.length > 0) {
                const [r, c] = neighbors[Math.floor(Math.random() * neighbors.length)];
                this._startMovement(r,c);
            } else {
                return;
            }
        }
    }

    /**
     * Build the state key string exactly matching backend version
     * Format: '[zombieRow, zombieCol, [wallUp, wallRight, wallDown, wallLeft], collectedKeys]'
     */
    _buildStateKey(zombieRow, zombieCol, collectedKeys) {
        // wall booleans
        const wallUp = !this.wallManager.canMoveFromTo(zombieRow, zombieCol, zombieRow - 1, zombieCol);
        const wallRight = !this.wallManager.canMoveFromTo(zombieRow, zombieCol, zombieRow, zombieCol + 1);
        const wallDown = !this.wallManager.canMoveFromTo(zombieRow, zombieCol, zombieRow + 1, zombieCol);
        const wallLeft = !this.wallManager.canMoveFromTo(zombieRow, zombieCol, zombieRow, zombieCol - 1);

        const walls = [wallUp, wallRight, wallDown, wallLeft];
        return JSON.stringify([zombieRow, zombieCol, walls, collectedKeys]);
    }


    /**
     * Select the best action from the Q-Table for the given state key.
     * Falls back to random action if the state is missing.
     * @param {string} stateKey
     * @returns {number} 0-3
     */
    _qAction(stateKey) {
        if (this.qTable && stateKey in this.qTable) {
            const qValues = this.qTable[stateKey];
            const maxQ = Math.max(...qValues);
            const bestActions = [];
            qValues.forEach((val,idx) => {
                if (val === maxQ) bestActions.push(idx);
            });
            return bestActions[Math.floor(Math.random() * bestActions.length)];
        }
        // Fallback
        return Math.floor(Math.random() * 4);
    }

    /**
     * Get all valid neighbouring cells (open passages only)
     * Used as fallback wehn Q-table suggests a blocked move
     * @returns {Array<[number,number]>}
     */
    _getNeighbors(row,col) {
        const candidates = [
            [row - 1, col], // up
            [row, col + 1], // right 
            [row + 1, col], // down
            [row, col - 1], // left
        ];
        return candidates.filter(([r,c]) => {
            return this.wallManager.canMoveFromTo(row,col,r,c);
        });
    }

    /** 
     * Commits the zomvie to moving toward target grid cell (mirrors PLayer._startMovement)
     * @param {number} targetRow
     * @param {number} targetCol
     */
    _startMovement(targetRow, targetCol) {
        this.isMoving = true;
        this.targetPosition = {
            x: targetCol * this.gridSize + this.gridSize / 2,
            y: targetRow * this.gridSize + this.gridSize / 2
        };

        const deltaX = this.targetPosition.x - this.sprite.x;
        const deltaY = this.targetPosition.y - this.sprite.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        this.moveDirection = {
            x: (deltaX / distance) * this.speed,
            y: (deltaY / distance) * this.speed
        };
    }

    _deltaToDirection(dRow , dCol){
        if (Math.abs(dRow) > Math.abs(dCol)) {
            return dRow > 0 ? 'right' : 'left';
        } else {
            return dCol > 0 ? 'down' : 'up';
        }

        this.currentDirection = direction; 
        return direction;
    }

    /**
     * Smothly moves the zombie sprite toward the target pixel position (mirrors Player)
     * @param {number} delta - Time in milliseconds since the last frame.
     */
    _updateMovement(delta) {
        const deltaSeconds = delta / 1000;
        this.sprite.x += this.moveDirection.x * deltaSeconds;
        this.sprite.y += this.moveDirection.y * deltaSeconds;

        // Snap to target when close enough
        const dx = this.targetPosition.x - this.sprite.x;
        const dy = this.targetPosition.y - this.sprite.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            this.sprite.x = this.targetPosition.x;
            this.sprite.y = this.targetPosition.y;
            this.isMoving = false;

            // Update logical grid position
            this.zombieGridPos.row = Math.round(
                (this.sprite.y - this.gridSize / 2) / this.gridSize
            );
            this.zombieGridPos.col = Math.round(
                (this.sprite.x - this.gridSize / 2) / this.gridSize
            );
        }
    }

    /** 
     * Cycles through walking frames
     * @param {number} delta
     */
    _handleWalkingAnimation(delta) {
        if (this.isMoving) {
            this.walkTimer += delta;
            if (this.walkTimer >= this.walkInterval) {
                this.walkTimer = 0;
                this.walkFrame = (this.walkFrame % 6) + 1;
                const frameKey = `zombie_frame_${this.walkFrame}`;
                if (this.scene.textures.exists(frameKey)) {
                    this.sprite.setTexture(frameKey);
                    this.sprite.setDisplaySize(this.zombieSize, this.zombieSize);
                }
            }
        } else {
            const idleKey = `zombie_${this.currentDirection}`;
            if (this.scene.textures.exists(idleKey)) {
                this.sprite.setTexture(idleKey);
                this.sprite.setDisplaySize(this.zombieSize, this.zombieSize);
            }
        }
    }
}