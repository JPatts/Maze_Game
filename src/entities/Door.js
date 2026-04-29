import Phaser from "phaser";

export default class Door {
    constructor(scene, row, col, gridSize) {
        this.scene = scene;
        this.gridRow = row;
        this.gridCol = col;
        this.gridSize = gridSize;
        this.isOpen = false;       // false = door_closed, true = door_open

        // pixel center
        const x = col * gridSize + gridSize / 2;
        const y = row * gridSize + gridSize / 2;

        // start with the closed sprite
        this.sprite = scene.add.sprite(x, y, 'door_closed');
        this.sprite.setDisplaySize(gridSize - 5, gridSize - 5); // almost full cell
        this.sprite.setDepth(5);   // same layer as keys
    }

    /**
     * Switches texture to the open door.
     * Called when all keys have been collected.
     */
    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.sprite.setTexture('door_open');
        // optional: a quick tween to make it pop
        this.scene.tweens.add({
            targets: this.sprite,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 200,
            yoyo: true,
        });
    }

    /**
     * Returns true if the player is on the same grid cell AND the door is open.
     */
    canEnter(playerGridPos) {
        return this.isOpen
            && playerGridPos.row === this.gridRow
            && playerGridPos.col === this.gridCol;
    }
}