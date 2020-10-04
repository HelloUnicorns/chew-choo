class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    preload() {}

    create() {
        this.speed_meter = this.add.text(0, 0, 'Game Over', { font: '120px Arial', fill: '#ffffff' });
    }

    update() {}
}

module.exports = {
    GameOverScene: GameOverScene
}
