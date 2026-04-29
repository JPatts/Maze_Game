import Phaser from "phaser";

export default class Key {
    constructor(scene, row, col, gridSize) {
        this.scene = scene;
        this.gridRow = row;
        this.gridCol = col;
        this.gridSize = gridSize;
        this.collected = false;

        // pixel position
        const x = col * gridSize + gridSize / 2;
        const y = row * gridSize + gridSize / 2;

        // sprite - starts with first frame
        this.sprite = scene.add.sprite(x, y, 'key_01');
        this.sprite.setDisplaySize(gridSize - 10, gridSize - 10);

        // animation state
        this.currentFrame = 1;
        this.animationSpeed = 120; // ms per frame
        this.lastFrameTime = 0;

        // sets high depth so the keys are always visible
        this.sprite.setDepth(5);
    }

    /**
     * Advances spinning animation 
     * Called every fram from the scene's update()
     */
    update(time) {
        if (this.collected) return;

        if (time - this.lastFrameTime > this.animationSpeed) {
            this.currentFrame = this.currentFrame % 24 + 1;
            const pad = String(this.currentFrame).padStart(2, '0');
            this.sprite.setTexture(`key_${pad}`);
            this.lastFrameTime = time;
        }
    }

    /**
     * Returns true if player is on the same grid cell
     */
    isPlayerOnKey(playerGridPos) {
        return !this.collected 
            && playerGridPos.row === this.gridRow
            && playerGridPos.col === this.gridCol;
    }

    // Removes the key sprite and marks it collected
    collect() {
        this.collected = true;
        this.sprite.destroy();
    }

}