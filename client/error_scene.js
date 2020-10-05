class ErrorScene extends Phaser.Scene {
    constructor() {
        super('ErrorScene');
    }

    init(message) {
        this.message = message;
    }

    preload() {}

    create() {
        this.game_over_text = this.add.text(0, 0, this.message, { font: '120px Arial', fill: '#ffffff' });
    }

    update() {}
}

module.exports = {
    ErrorScene: ErrorScene
}
