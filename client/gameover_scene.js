class GameoverScene extends Phaser.Scene {
    constructor() {
        super('GameoverScene');
    }

    preload() {}

    create() {
        this.speed_meter = this.add.text(0, 0, 'Game Over', { font: '120px Arial', fill: '#ffffff' });
    }

    update() {}
}

module.exports = {
    GameoverScene: GameoverScene
}
