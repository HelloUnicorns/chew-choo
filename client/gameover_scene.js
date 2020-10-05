const constants = require('../common/constants.js');

class GameoverScene extends Phaser.Scene {
    constructor() {
        super('GameoverScene');
    }

    preload() {}

    create() {
        this.background = this.add.rectangle(0, 0, constants.CANVAS_WIDTH, constants.CANVAS_HEIGHT, 0x000000, 0);
        this.background.setOrigin(0, 0);
        this.game_over_text = this.add.text(0, 0, 'Game Over', { font: '120px Arial', fill: '#ffffff' });
    }
    
    update() {
        if (this.background.fillAlpha < 0.7) {
            this.background.fillAlpha += Math.min(0.1, 0.7 - this.background.fillAlpha);
        }
    }
}

module.exports = {
    GameoverScene: GameoverScene
}
