class WinScene extends Phaser.Scene {
    constructor() {
        super('WinScene');
    }

    preload() {}

    create() {
        this.game_over_text = this.add.text(0, 0, 'You win!', { font: '120px Arial', fill: '#ffffff' });
    }

    update() {}
}

module.exports = {
    WinScene: WinScene
}
