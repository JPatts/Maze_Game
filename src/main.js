import Phaser from 'phaser';
import GameScene from './game/scenes/Game.js';

console.log('Phaser version:', Phaser.VERSION);
console.log('GameScene', GameScene);

const config = {
    type: Phaser.AUTO,
    parent: 'game-container', 
    width: 1200,
    height: 900,
    scene: [GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // No gravity for top-down game
            debug: false
        }
    }
};
  
const game = new Phaser.Game(config);
console.log('Game instance created:', game);

export default game;