const global_data = require('./global_data.js')

class SpeedMeterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SpeedMeterScene', active: true });
    }

    preload() {}

    create() {
        this.speed_meter = this.add.text(0, 0, 'Speed: 0', { font: '48px Arial', fill: '#000000' });
    }

    update() {
        if (global_data.player.train) {
            this.speed_meter.setText('Speed: ' + global_data.player.train.speed.toFixed(2));
        }
    }
}

module.exports = {
    SpeedMeterScene: SpeedMeterScene
}
