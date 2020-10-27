const constants = require('../common/constants.js');

const out_color = "#0f0"
const over_color = "#FF00FF"

class GameoverScene extends Phaser.Scene {
    constructor() {
        super('GameoverScene');
    }

    preload() {}

    restartGame(){
        this.scene.start('GameScene');
    }

    create() {
        this.background = this.add.rectangle(0, 0, constants.CANVAS_WIDTH, constants.CANVAS_HEIGHT, 0x000000, 0);
        this.background.setOrigin(0, 0);
        this.game_over_text = this.add.text(constants.CANVAS_WIDTH/4, constants.CANVAS_HEIGHT/4, 'Game Over!', { font: '120px Arial', fill: '#ffffff' });
        this.restart = this.add.text(constants.CANVAS_WIDTH/2.5, constants.CANVAS_HEIGHT/2, 'RESTART', { font: '60px Arial', fill: out_color });
        this.restart.setInteractive()
        .on('pointerover',() => this.restart.setFill(over_color))
        .on('pointerout',() => this.restart.setFill(out_color))
        .on('pointerdown', () => this.restartGame())

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
