const global_data = require('./global_data.js');
const constants = require('../common/constants.js');

const SPEED_METER_SCALE = 0.5;

const SPEED_METER_COLORS_IMAGE_HEIGHT = 253;
const SPEED_METER_COLORS_IMAGE_WIDTH = 482;
const SPEED_METER_COLORS_HEIGHT = SPEED_METER_COLORS_IMAGE_HEIGHT * SPEED_METER_SCALE;
const SPEED_METER_COLORS_WIDTH = SPEED_METER_COLORS_IMAGE_WIDTH * SPEED_METER_SCALE;

const SPEED_METER_ARROWS_IMAGE_HEIGHT = 239;
const SPEED_METER_ARROWS_IMAGE_X_OFFSET = -15.5;
const SPEED_METER_ARROWS_IMAGE_Y_OFFSET = 20;
const SPEED_METER_ARROWS_HEIGHT = SPEED_METER_ARROWS_IMAGE_HEIGHT * SPEED_METER_SCALE;
const SPEED_METER_ARROWS_X_OFFSET = SPEED_METER_ARROWS_IMAGE_X_OFFSET * SPEED_METER_SCALE;
const SPEED_METER_ARROWS_Y_OFFSET = SPEED_METER_ARROWS_IMAGE_Y_OFFSET * SPEED_METER_SCALE;

class SpeedMeterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SpeedMeterScene', active: true });
    }

    preload() {
        this.load.image('speed_meter_colors', 'assets/speed_meter_colors.png');
        this.load.image('speed_meter_arrow', 'assets/speed_meter_arrow.png');
    }

    create() {
        this.speed_meter = this.add.text(0, 0, 'Speed: 0', { font: '48px Arial', fill: '#000000' });
        
        let speed_meter_colors = this.add.sprite(
            constants.CANVAS_WIDTH - SPEED_METER_COLORS_WIDTH / 2,
            constants.CANVAS_HEIGHT - SPEED_METER_COLORS_HEIGHT / 2,
            'speed_meter_colors');
        speed_meter_colors.setScale(SPEED_METER_SCALE);
        
        this.speed_meter_arrow = this.add.sprite(
            constants.CANVAS_WIDTH - SPEED_METER_COLORS_WIDTH / 2 + SPEED_METER_ARROWS_X_OFFSET,
            constants.CANVAS_HEIGHT - SPEED_METER_ARROWS_HEIGHT /2 + SPEED_METER_ARROWS_Y_OFFSET,
            'speed_meter_arrow'
        );
        this.speed_meter_arrow.setScale(SPEED_METER_SCALE);
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
