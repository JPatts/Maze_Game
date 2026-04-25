import Phaser from "phaser";

export default class Zombie {
    constructor(scene, gridSize, zombieSize, wallManager, mazeGenerator) {
        this.scene = scene;
        this.GRID_SIZE = gridSize;
        this.ZOMBIE_SIZE = zombieSize;
        this.wallManager = wallManager;
        this.mazeGenerator = mazeGenerator;

        // Grid-based movement
        this.isMoving = false;
        this.moveSpeed = 400; // pixels per second
        this.targetPosition = null;
        this.playerGridPos = { row: 0, col: 0 };

        // Animation
        this.currentFrame = 1;
        this.animationTimer = 0;
        this.animationSpeed = 18; // if 120 moves slower than human

        // A* state
        this.currentPath = [];
        this.pathIndex = 0; 
    }

    /**
     * Places Zombie on grid, typically at opposite corner of human
     * @param {number} row - Starting row.
     * @param {number} col - Starting col.
     */
    initializeZombie(row, col) {
        this.zombieGridPos = {row, col}
        
        const startX = col * this.GRID_SIZE + this.GRID_SIZE / 2;
        const startY = row * this.GRID_SIZE + this.GRID_SIZE / 2;

        this.zombie = this.scene.add.sprite(startX,startY, 'zombie_down');
        this.zombie.setDisplaySize(this.ZOMBIE_SIZE, this.ZOMBIE_SIZE);
    
        this.zombieDirection = 'down';
        this.targetPosition = { x: startX, y: startY};
    }

    /**
     * Main AI update called every frame. Recalculates the path and issues the next move.
     * @param {number} delta - Time in milliseconds since the last frame.
     * @param {{row: number, col: number}} playerGridPos - The human's current grid position
     */
    updateAI(delta, playerGridPos) {
        // if not moving
        if (!this.isMoving) {
            this._recalculatePath(playerGridPos);

            if (this.currentPath.length > 1) {
                const nextStep = this.currentPath[1]; 
                this._startMovement(nextStep.row, nextStep.col);
            }
        }

        this._updateMovement(delta);
        this._handleWalkingAnimation(delta);
    }

    /**
     * Runs A* from the zombie's current position to the players grid position.
     * Stores the resulting path in currentPath
     * @param {{row: number, col: number}} targetPos - The Player's grid position.
     */
    _recalculatePath(targetPos) {
        const start = this.zombieGridPos;
        const goal = targetPos;

        // if already on target no path needed
        if (start.row === goal.row && start.col === goal.col) {
            this.currentPath = [start];
            return;
        }

        // A* open list (prioritized by fCost) and closed set
        const openList = [];
        const closedSet = new Set();
        const gCost = {}; // Cost from start to given 
        const parent = {}; // For reconstructing the path

        const startKey = `${start.row},${start.col}`;
        gCost[startKey] = 0;
        openList.push({
            row: start.row,
            col: start.col,
            fCost: this._heuristic(start, goal)
        });

        let pathFound = false;

        while (openList.length > 0) {
            // Sort by fCost (ascending) and take the best node
            openList.sort((a,b) => a.fCost - b.fCost);
            const current = openList.shift();
            const currentKey = `${current.row},${current.col}`;

            // check goal reached
            if (current.row === goal.row && current.col === goal.col) {
                pathFound = true;
                break;
            }

            closedSet.add(currentKey);

            // explore neighbors using the maze generator (respects walls)
            const neighbors = this.mazeGenerator.getNeighbors(current.row, current.col);
            for (const [nRow, nCol] of neighbors) {
                const neighborKey = `${nRow},${nCol}`;
                if (closedSet.has(neighborKey)) continue;

                const tentativeG = (gCost[currentKey] || 0) + 1;

                if (tentativeG < (gCost[neighborKey] || Infinity)) {
                    gCost[neighborKey] = tentativeG;
                    parent[neighborKey] = { row: current.row, col: current.col };
                    const h = this._heuristic({ row: nRow, col: nCol }, goal);
                    openList.push({
                        row: nRow,
                        col: nCol,
                        fCost: tentativeG + h
                    });
                }
            }

        }

        // Reconstruct path
        if (pathFound) {
            const path = [];
            let step = { row: goal.row, col: goal.col };
            while (step) {
                path.unshift(step);
                const key = `${step.row},${step.col}`;
                step = parent[key];
            }
            this.currentPath = path;
        } else {
            // no path found; should never happen in connected maze
            this.currentPath = [this.zombieGridPos];
        }
    } 

    /**
     * Manhattan Distance heuristic for A*
     * @param {{row: number, col: number}} a
     * @param {{row: number, col: number}} b 
     * @returns {number}
     */
    _heuristic(a,b) {
        return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
    }

    /** 
     * Commits the zomvie to moving toward target grid cell (mirrors PLayer._startMovement)
     * @param {number} targetRow
     * @param {number} targetCol
     */
    _startMovement(targetRow, targetCol) {
        this.isMoving = true;
        this.zombieGridPos.row = targetRow;
        this.zombieGridPos.col = targetCol;

        this.targetPosition = {
            x: targetCol * this.GRID_SIZE + this.GRID_SIZE / 2,
            y: targetRow * this.GRID_SIZE + this.GRID_SIZE / 2,
        }

        // set direction for sprite
        const dx = targetCol - (this.zombieGridPos.col);
        const dy = targetRow - (this.zombieGridPos.row);
    }

    /**
     * Smothly moves the zombie sprite toward the target pixel position (mirrors Player)
     * @param {number} delta - Time in milliseconds since the last frame.
     */
    _updateMovement(delta) {
        if (!this.isMoving) return;

        const speed = this.moveSpeed * (delta / 1000);
        const dx = this.targetPosition.x - this.zombie.x;
        const dy = this.targetPosition.y - this.zombie.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= speed) {
            // Snap to target
            this.zombie.x = this.targetPosition.x;
            this.zombie.y = this.targetPosition.y;
            this.isMoving = false;
        } else {
            // Move toward target
            const ratio = speed / distance;
            this.zombie.x += dx * ratio;
            this.zombie.y += dy * ratio;
        }
    }

    /** 
     * Cycles through walking frames
     * @param {number} delta
     */
    _handleWalkingAnimation(delta) {
        if (this.isMoving) {
            this.animationTimer += delta;
            if ( this.animationTimer >= this.animationSpeed) {
                this.animationTimer = 0;
                this.currentFrame = (this.currentFrame % 6) + 1;
                this.zombie.setTexture(`zombie_frame_${this.currentFrame}`);
                this.zombie.setDisplaySize(this.ZOMBIE_SIZE, this.ZOMBIE_SIZE);
            }
        } else {
            if (this.currentFrame !== 0) {
                this.currentFrame = 0;
                this.zombie.setTexture(`zombie_${this.zombieDirection}`);
                this.zombie.setDisplaySize(this.ZOMBIE_SIZE, this.ZOMBIE_SIZE);
            }
        }
    }
}