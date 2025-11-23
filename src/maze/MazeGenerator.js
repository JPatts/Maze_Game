import Phaser from "phaser";

export default class MazeGenerator {
    constructor(rows, cols, gridSize) {
        this.rows = rows;
        this.cols = cols;
        this.gridSize = gridSize;
        this.grid = [];
        
        this.directions = [
            [-1, 0, 0, 2],  // Up: remove top wall of current, bottom wall of next
            [0, 1, 1, 3],   // Right: remove right wall of current, left wall of next  
            [1, 0, 2, 0],   // Down: remove bottom wall of current, top wall of next
            [0, -1, 3, 1]   // Left: remove left wall of current, right wall of next
        ];
    }

    generateMaze(startR, startC) {
        // Initialize grid with all walls
        this._initializeGridWithWalls();
        
        // Fixed seed for reproducible mazes
        this._setRandomSeed(42);
        
        // Depth First Search maze carving
        this._carveMaze(startR, startC);
        
        return this.grid;
    }

    _initializeGridWithWalls() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push({
                    walls: [true, true, true, true], // [top, right, bottom, left]
                    background: '/assets/Board/grass_patch_1.png'
                });
            }
            this.grid.push(row);
        }
    }

    _carveMaze(startR, startC) {
        const stack = [[startR, startC]];
        const visited = new Set();
        visited.add(`${startR},${startC}`);

        while (stack.length > 0) {
            const [r, c] = stack[stack.length - 1];
            
            // Shuffle directions
            const shuffledDirs = this._shuffleArray([...this.directions]);
            
            let carved = false;
            for (const [dr, dc, wallCurr, wallNext] of shuffledDirs) {
                const nr = r + dr;
                const nc = c + dc;
                
                if (this._inBounds(nr, nc) && !visited.has(`${nr},${nc}`)) {
                    // Remove walls between current and next cell
                    this.grid[r][c].walls[wallCurr] = false;
                    this.grid[nr][nc].walls[wallNext] = false;
                    
                    visited.add(`${nr},${nc}`);
                    stack.push([nr, nc]);
                    carved = true;
                    break;
                }
            }
            
            if (!carved) {
                stack.pop();
            }
        }
    }

    _inBounds(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    _shuffleArray(array) {
        // Fisher-Yates shuffle with fixed seed
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this._seededRandom() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    _setRandomSeed(seed) {
        this._seed = seed;
    }

    _seededRandom() {
        // Simple seeded random generator
        this._seed = (this._seed * 9301 + 49297) % 233280;
        return this._seed / 233280;
    }

    getNeighbors(row, col) {
        const neighbors = [];
        const walls = this.grid[row][col].walls;

        // Check each direction if there's no wall
        if (row > 0 && !walls[0]) neighbors.push([row - 1, col]);     // Up
        if (col < this.cols - 1 && !walls[1]) neighbors.push([row, col + 1]); // Right
        if (row < this.rows - 1 && !walls[2]) neighbors.push([row + 1, col]); // Down
        if (col > 0 && !walls[3]) neighbors.push([row, col - 1]);     // Left

        return neighbors;
    }
}