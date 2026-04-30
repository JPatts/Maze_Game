import Phaser from "phaser";
import MazeGenerator from "../../maze/MazeGenerator";
import WallManager from "../../maze/WallManager";
import Player from "../../entities/Player"
import Zombie from "../../entities/Zombie";
import Key from "../../entities/Key"; 
import Door from "../../entities/Door"; 

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
        
        // Game constants
        this.GRID_SIZE = 60;
        this.BOARD_WIDTH = 15;
        this.BOARD_HEIGHT = 15;
        this.PLAYER_SIZE = this.GRID_SIZE - 10;
        
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
        this.load.image('background', 'assets/Board/grass_patch_1.png');
        
        // human images
        for (let i = 1; i <= 6; i++) {
            this.load.image(`human_frame_${i}`, `assets/Human/human_${i}.png`);
        }
       
        this.load.image('human_down', 'assets/Human/human_1.png'); 
        this.load.image('human_up', 'assets/Human/human_1.png');
        this.load.image('human_left', 'assets/Human/human_2.png');
        this.load.image('human_right', 'assets/Human/human_1.png');
        this.load.image('human_dead', 'assets/Human/human_dead.png');
        this.load.image('tombstone', 'assets/Human/tombstone.png');

        // Zombie images
        for (let i = 1; i <= 6; i++) {
            this.load.image(`zombie_frame_${i}`, `assets/Zombie/zombie_${i}.png`);
        }
       
        this.load.image('zombie_down', 'assets/Zombie/zombie_1.png'); 
        this.load.image('zombie_up', 'assets/Zombie/zombie_1.png');
        this.load.image('zombie_left', 'assets/Zombie/zombie_2.png');
        this.load.image('zombie_right', 'assets/Zombie/zombie_3.png');

        // key images
        for (let i = 1; i <= 24; i++) {
            const padded = String(i).padStart(2, '0');
            this.load.image(`key_${padded}`, `assets/Key/key_${padded}.png`);
        }

        // door images
        this.load.image('door_closed', `assets/Dungeon_Door/door_closed.png`);
        this.load.image('door_open', `assets/Dungeon_Door/door_open.png`);

        // Death Animation
        for (let i = 1; i <= 9; i++) {
            this.load.image(`death_frame_${i}`, `assets/Death_Animation/Zombie_eating_Human_0${i}.png`);
        } 
    }

    /**
     * Creates and initializes all game objects when the scene starts.
     * @returns {void}
     */
    create() {
        this.gameOver = false;
        this.gameOverTriggered = false;
        
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
        this.zombieEntity.initializeZombie(0,14);

        // Key placements
        this.keys = [];
        this.collectedKeys = 0;
        
        const keyPositions = [
            { row: 0, col: 0}, // top left
            { row: 14, col: 14}, // bottom right
            { row: 7, col: 7}, // middle  
        ];

        keyPositions.forEach(({ row, col}) => {
            const key = new Key(this, row, col, this.GRID_SIZE);
            this.keys.push(key);
        });

        // create Door
        this.door = new Door(this, 8, 14, this.GRID_SIZE);
        this.winTriggered = false;

        this.createSidePanel();
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
        // Game over check happens first
        if ( !this.gameOver && 
            !this.winTriggered &&
            this.zombieEntity.zombieGridPos.row === this.playerEntity.playerGridPos.row &&
            this.zombieEntity.zombieGridPos.col === this.playerEntity.playerGridPos.col) {
                this._triggerGameOver();
                return;
            }
    
        this.playerEntity._handlePlayerInput();
        this.playerEntity._updatePlayerMovement(delta);
        this.playerEntity._handleWalkingAnimation(delta);

        // Zombie 
        this.zombieEntity.updateAI(delta, this.playerEntity.playerGridPos);

        for (const key of this.keys) {
            // update spinning animation
            key.update(time);

            // check if player walked onto the key
            if (key.isPlayerOnKey(this.playerEntity.playerGridPos)) {
                key.collect();
                this.collectedKeys++;

                // update this side panel to show collected constructor
                if (this.keyTickerText) {
                    this.keyTickerText.setText(`Keys: ${this.collectedKeys}`);
                }

                // Open door when all keys are collected
                if (this.collectedKeys >= 3) {
                    this.door.open();
                }
            }
        }

        if (this.door && this.door.canEnter(this.playerEntity.playerGridPos)) {
            if (!this.winTriggered) {
                this.winTriggered = true;
                this.showWinScreen();
            }
        }
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

    _triggerGameOver() {
        if (this.gameOverTriggered) return;
        this.gameOverTriggered = true;
        this.gameOver = true;

        if (this.zombieEntity && this.zombieEntity.zombie) {
            const playerX = this.playerEntity.player.x;
            const playerY = this.playerEntity.player.y;
            this.zombieEntity.zombie.x = playerX;
            this.zombieEntity.zombie.y = playerY;
        }

        // Hide the original sprites (to be replaced by death animation)
        this.playerEntity.player.setVisible(false);
        if (this.zombieEntity && this.zombieEntity.zombie) {
            this.zombieEntity.zombie.setVisible(false);
        }

        // position of the collision ( the player's cell)
        const cellX = this.playerEntity.playerGridPos.col * this.GRID_SIZE + this.GRID_SIZE / 2;
        const cellY = this.playerEntity.playerGridPos.row * this.GRID_SIZE + this.GRID_SIZE / 2;

        // create death animation
        this.deathSprite = this.add.sprite(cellX, cellY, 'death_frame_1');
        this.deathSprite.setDisplaySize(this.GRID_SIZE, this.GRID_SIZE);

        // cycle through death animation frames
        let currentFrame = 1;
        const totalFrames = 9;
        this.time.addEvent({
            delay: 100,
            repeat: totalFrames - 1,
            callback: () => {
                currentFrame++;
                if (currentFrame <= totalFrames) {
                    this.deathSprite.setTexture(`death_frame_${currentFrame}`);
                }
                if (currentFrame === totalFrames) {
                    // After last frame of death animation, wait a moment before Game Over text
                    this.time.delayedCall(300, () => {
                        this.deathSprite.destroy();
                        this._showGameOverText();
                    })
                }
            }
        })
    }

    _showGameOverText() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        // "GAME OVER" title
        this.add.text(centerX, centerY - 40, 'GAME OVER', {
            fontSize: '64px',
            fontFamily: 'monospace',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);

        // Restart instruction
        this.add.text(centerX, centerY + 20, 'Press SPACE to restart', {
            fontSize: '24px',
            fontFamily: 'monospace',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Listen for the restart key - Space bar
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.restart();
        });
    }

    createSidePanel() {
        const panelX = 910;
        const panelWidth = this.scale.width - panelX;
        const panelHeight = this.scale.height;

        // 1. A semi transparent background so the panel stands out
        this.add.rectangle(panelX + panelWidth / 2, panelHeight / 2, panelWidth, panelHeight, 0x222222, 0.9).setOrigin(0.5).setDepth(10);
        
        // 2. Instructions text
        this.instructionsText = this.add.text(panelX + 10, 30,
            [
                'HOW TO PLAY',
                '',
                'Use Arrow keys to move',
                '         ←↑→↓         ',
                '',
                'Get the keys ',
                'to',
                'unlock the door',
                '',
                'Reach the door',
                'to',
                'ESCAPE   ',
                '',
            ].join('\n'),
            {
                fontSize: '18px',
                fontFamily: 'monospace',
                color: '#ffffff',
                lineSpacing: 6
            }
        ).setDepth(11);

        // 3. Ticker for how many times the zombie has won
        this.zombieWins = 0;   // reset each session, or load from localStorage
        this.tickerText = this.add.text(panelX + 10, 855,
            `Zombie wins: ${this.zombieWins}`,
            {
                fontSize: '20px',
                fontFamily: 'monospace',
                color: '#ff6666',
                fontStyle: 'bold'
            }
        ).setDepth(11);

        // 4. Show ticker for collected keys
        this.keyTickerText = this.add.text(panelX + 10, 800, 'Keys: 0', 
            {
                fontSize: '20px',
                fontFamily: 'monospace',
                color: '#ffcc00',
                fontStyle: 'bold'
            }
        ).setDepth(11);
    }

    showWinScreen() {
        // Hide zombie 
        if (this.zombieEntity && this.zombieEntity.zombie) {
            this.zombieEntity.zombie.setVisible(false);
        }

        // Semi-transparent dark overlay
        const overlay = this.add.rectangle(
            this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height,
            0x000000, 0.8
        ).setDepth(20);

        // Big "YOU WIN" text
        this.add.text(
            this.scale.width / 2, this.scale.height / 2 - 30,
            'YOU WIN!', {
                fontSize: '64px',
                fontFamily: 'monospace',
                color: '#409d1b',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 6
            }
        ).setOrigin(0.5).setDepth(21);
        
        //this.zombieEntity.destroy();

        // Restart instruction
        this.add.text(
            this.scale.width / 2, this.scale.height / 2 + 50,
            'Press SPACE to play again', {
                fontSize: '24px',
                fontFamily: 'monospace',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(21);

        // Listen for restart on spacebar
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.restart();
        });
    }
}