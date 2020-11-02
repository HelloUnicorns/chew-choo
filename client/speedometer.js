const constants = require('../common/constants.js');

const SPEED_METER_SCALE = 0.5;

const SPEED_METER_COLORS_IMAGE_HEIGHT = 258;
const SPEED_METER_COLORS_IMAGE_WIDTH = 492;
const SPEED_METER_COLORS_HEIGHT = SPEED_METER_COLORS_IMAGE_HEIGHT * SPEED_METER_SCALE;
const SPEED_METER_COLORS_WIDTH = SPEED_METER_COLORS_IMAGE_WIDTH * SPEED_METER_SCALE;

const SPEED_METER_ARROWS_IMAGE_X_OFFSET = -15.5;
const SPEED_METER_ARROWS_X_OFFSET = SPEED_METER_ARROWS_IMAGE_X_OFFSET * SPEED_METER_SCALE;

const SPEED_METER_ARROW_MIN_ANGLE = -85;
const SPEED_METER_ARROW_MAX_ANGLE = 85;

export class Speedometer {
    constructor(scene) {
        this.scene = scene;
    }

    preload() {
        this.scene.load.image('speed_meter_colors', 'assets/speed_meter_colors.png');
        this.scene.load.image('speed_meter_arrow', 'assets/speed_meter_arrow.png');
    }

    create() {
        let speed_meter_colors = this.scene.add.sprite(
            constants.CANVAS_WIDTH - SPEED_METER_COLORS_WIDTH / 2 - 10,
            constants.CANVAS_HEIGHT - SPEED_METER_COLORS_HEIGHT / 2,
            'speed_meter_colors');
        speed_meter_colors.setScale(SPEED_METER_SCALE);
        speed_meter_colors.setAlpha(0.5);
        
        this.speed_meter_arrow = this.scene.add.sprite(
            constants.CANVAS_WIDTH - SPEED_METER_COLORS_WIDTH / 2 - 10 + SPEED_METER_ARROWS_X_OFFSET,
            constants.CANVAS_HEIGHT,
            'speed_meter_arrow'
        );
        this.speed_meter_arrow.setScale(SPEED_METER_SCALE);
        this.speed_meter_arrow.setOrigin(0.5, 0.92);
        this.speed_meter_arrow.setAlpha(0.8);

        this.speed_meter = this.scene.add.text(
            constants.CANVAS_WIDTH - SPEED_METER_COLORS_WIDTH / 2 - 18,
            constants.CANVAS_HEIGHT - SPEED_METER_COLORS_HEIGHT / 2 + 20, 
            '0 tps',
            { font: '36px Lucida Console', fill: '#000000' });
        this.speed_meter.setOrigin(0.5, 0.5);
    }

    update(speed) {
        this.speed_meter.setText(`${speed.toFixed(1)} tps`);
        let angle = SPEED_METER_ARROW_MIN_ANGLE + (SPEED_METER_ARROW_MAX_ANGLE - SPEED_METER_ARROW_MIN_ANGLE) * (speed - constants.MIN_SPEED) / (constants.MAX_SPEED - constants.MIN_SPEED);
        this.speed_meter_arrow.setAngle(angle);
    }
}
