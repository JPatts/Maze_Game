import Phaser from "phaser";
import MazeGenerator from "../../maze/MazeGenerator";
import WallManager from "../../maze/WallManager";
import Player from "../../entities/Player"
import Zombie from "../../entities/Zombie";

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
    }

    /**
     * Preloads all assets needed for the game scene before it starts.
     * @returns {void}
     */
    preload() {
        // background images
        this.load.image('background', '/assets/Board/grass_patch_1.png');
        
        // human images
        for (let i = 1; i <= 6; i++) {
            this.load.image(`human_frame_${i}`, `/assets/Human/human_${i}.png`);
        }
       
        this.load.image('human_down', '/assets/Human/human_1.png'); 
        this.load.image('human_up', '/assets/Human/human_1.png');
        this.load.image('human_left', '/assets/Human/human_2.png');
        this.load.image('human_right', '/assets/Human/human_1.png');
        this.load.image('human_dead', '/assets/Human/human_dead.png');
        this.load.image('tombstone', '/assets/Human/tombstone.png');

        // Zombie images
        for (let i = 1; i <= 6; i++) {
            this.load.image(`zombie_frame_${i}`, `/assets/Zombie/zombie_${i}.png`);
        }
       
        this.load.image('zombie_down', '/assets/Zombie/zombie_1.png'); 
        this.load.image('zombie_up', '/assets/Zombie/zombie_1.png');
        this.load.image('zombie_left', '/assets/Zombie/zombie_2.png');
        this.load.image('zombie_right', '/assets/Zombie/zombie_3.png');

        // key images
        for (let i = 1; i <= 24; i++) {
            this.load.image(`key_${i}`, `/assets/Key/key_${i}.png`);
        }

        // door images
        this.load.image('door_closed', `/assets/Dungeon_Door/door_closed.png`);
        this.load.image('door_open', `/assets/Dungeon_Door/door_open.png`);
    }

    /**
     * Creates and initializes all game objects when the scene starts.
     * @returns {void}
     */
    create() {
        this._generateMaze();
        this._createBoard();
        this._createWalls();

        this.playerEntity = new Player(this, this.GRID_SIZE, this.PLAYER_SIZE, this.wallManager);
        this.playerEntity._initializePlayer();
        this.cursors = this.input.keyboard.createCursorKeys();
        this.playerEntity.cursors = this.cursors;

        // zombie setup
        this.zombieEntity = new Zombie(
            this,
            this.GRID_SIZE,
            this.PLAYER_SIZE,
            this.wallManager,
            this.mazeGenerator
        );
        this.zombieEntity.initializeZombie(7,14);
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
     * Main game loop called every frame by Phase.
     * @param {*} time - Total elapsed time in milliseconds.
     * @param {*} delta - Time in milliseconds since the last frame.
     * @returns {void}
     */
    update(time, delta) {
        this.playerEntity._handlePlayerInput();
        this.playerEntity._updatePlayerMovement(delta);
        this.playerEntity._handleWalkingAnimation(delta);

        // Zombie 
        this.zombieEntity.updateAI(delta, this.playerEntity.playerGridPos);
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
}