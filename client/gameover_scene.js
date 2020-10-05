const constants = require('../common/constants.js');

class GameoverScene extends Phaser.Scene {
    constructor() {
        super('GameoverScene');
    }

    preload() {}

    create() {
        this.background = this.add.rectangle(0, 0, constants.CANVAS_WIDTH, constants.CANVAS_HEIGHT, 0x000000, 0.7);
        this.background.setOrigin(0, 0);
        this.game_over_text = this.add.text(0, 0, 'Game Over', { font: '120px Arial', fill: '#ffffff' });
    }
    
    update() {
    }
}

module.exports = {
    GameoverScene: GameoverScene
}
