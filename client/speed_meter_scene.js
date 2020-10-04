const global_data = require('./global_data.js');
const constants = require('../common/constants.js');

const SPEED_METER_SCALE = 1;

const SPEED_METER_COLORS_IMAGE_HEIGHT = 258;
const SPEED_METER_COLORS_IMAGE_WIDTH = 492;
const SPEED_METER_COLORS_HEIGHT = SPEED_METER_COLORS_IMAGE_HEIGHT * SPEED_METER_SCALE;
const SPEED_METER_COLORS_WIDTH = SPEED_METER_COLORS_IMAGE_WIDTH * SPEED_METER_SCALE;

=const SPEED_METER_ARROWS_IMAGE_X_OFFSET = -15.5;
=const SPEED_METER_ARROWS_X_OFFSET = SPEED_METER_ARROWS_IMAGE_X_OFFSET * SPEED_METER_SCALE;

const SPEED_METER_ARROW_MIN_ANGLE = -85;
const SPEED_METER_ARROW_MAX_ANGLE = 85;

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
            constants.CANVAS_HEIGHT,
            'speed_meter_arrow'
        );
        this.speed_meter_arrow.setScale(SPEED_METER_SCALE);
        this.speed_meter_arrow.setOrigin(0.5, 0.92);
    }

    update() {
        if (global_data.player.train) {
            this.speed_meter.setText('Speed: ' + global_data.player.train.speed.toFixed(2));
        }
        let angle = SPEED_METER_ARROW_MIN_ANGLE + (SPEED_METER_ARROW_MAX_ANGLE - SPEED_METER_ARROW_MIN_ANGLE) * (global_data.player.train.speed - constants.MIN_SPEED) / (constants.MAX_SPEED - constants.MIN_SPEED);
        this.speed_meter_arrow.setAngle(angle);
    }
}

module.exports = {
    SpeedMeterScene: SpeedMeterScene
}
