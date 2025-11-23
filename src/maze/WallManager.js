import Phaser from "phaser";

export default class WallManager {
    constructor(scene, grid, gridSize) {
        this.scene = scene;
        this.grid = grid;
        this.gridSize = gridSize;
        this.wallGraphics = null;
    }

    createWalls() {
        // Create graphics object for drawing walls
        this.wallGraphics = this.scene.add.graphics();
        this.wallGraphics.lineStyle(3, 0x000000, 1); // Black lines, 3px width
        
        for (let row = 0; row < this.grid.length; row++) {
            for (let col = 0; col < this.grid[0].length; col++) {
                this._drawCellWalls(row, col);
            }
        }
    }

    _drawCellWalls(row, col) {
        const x = col * this.gridSize;
        const y = row * this.gridSize;
        const walls = this.grid[row][col].walls;

        // Draw each wall if it exists
        if (walls[0]) { // Top wall
            this.wallGraphics.moveTo(x, y);
            this.wallGraphics.lineTo(x + this.gridSize, y);
        }
        if (walls[1]) { // Right wall  
            this.wallGraphics.moveTo(x + this.gridSize, y);
            this.wallGraphics.lineTo(x + this.gridSize, y + this.gridSize);
        }
        if (walls[2]) { // Bottom wall
            this.wallGraphics.moveTo(x, y + this.gridSize);
            this.wallGraphics.lineTo(x + this.gridSize, y + this.gridSize);
        }
        if (walls[3]) { // Left wall
            this.wallGraphics.moveTo(x, y);
            this.wallGraphics.lineTo(x, y + this.gridSize);
        }

        this.wallGraphics.strokePath();
    }

    canMoveFromTo(fromRow, fromCol, toRow, toCol) {
        // Check if movement between two adjacent cells is allowed
        const walls = this.grid[fromRow][fromCol].walls;
        
        if (toRow === fromRow - 1 && toCol === fromCol) { // Moving up
            return !walls[0]; // No top wall
        }
        if (toRow === fromRow + 1 && toCol === fromCol) { // Moving down
            return !walls[2]; // No bottom wall
        }
        if (toRow === fromRow && toCol === fromCol - 1) { // Moving left
            return !walls[3]; // No left wall
        }
        if (toRow === fromRow && toCol === fromCol + 1) { // Moving right
            return !walls[1]; // No right wall
        }
        
        return false; // Not adjacent cells
    }

    getCellFromPixel(x, y) {
        // Convert pixel coordinates to grid coordinates
        const col = Math.floor(x / this.gridSize);
        const row = Math.floor(y / this.gridSize);
        return { row, col };
    }
}