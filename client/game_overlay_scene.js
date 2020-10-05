const global_data = require('./global_data.js');
const constants = require('../common/constants.js');
const { get_number_of_trains } = require('./train.js');
const { get_rails } = require('./rails.js');

const SPEED_METER_SCALE = 0.5;

const SPEED_METER_COLORS_IMAGE_HEIGHT = 258;
const SPEED_METER_COLORS_IMAGE_WIDTH = 492;
const SPEED_METER_COLORS_HEIGHT = SPEED_METER_COLORS_IMAGE_HEIGHT * SPEED_METER_SCALE;
const SPEED_METER_COLORS_WIDTH = SPEED_METER_COLORS_IMAGE_WIDTH * SPEED_METER_SCALE;

const SPEED_METER_ARROWS_IMAGE_X_OFFSET = -15.5;
const SPEED_METER_ARROWS_X_OFFSET = SPEED_METER_ARROWS_IMAGE_X_OFFSET * SPEED_METER_SCALE;

const SPEED_METER_ARROW_MIN_ANGLE = -85;
const SPEED_METER_ARROW_MAX_ANGLE = 85;

const LEADERBOARD_TOP_SIZE = 3;
const LEADERBOARD_DEFAULT_PLAYER_ROW_Y = 56 + 26 * LEADERBOARD_TOP_SIZE;


class GameOverlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverlayScene', active: true });
    }

    preload() {
        this.load.image('speed_meter_colors', 'assets/speed_meter_colors.png');
        this.load.image('speed_meter_arrow', 'assets/speed_meter_arrow.png');
    }

    create() {        
        let speed_meter_colors = this.add.sprite(
            constants.CANVAS_WIDTH - SPEED_METER_COLORS_WIDTH / 2,
            constants.CANVAS_HEIGHT - SPEED_METER_COLORS_HEIGHT / 2,
            'speed_meter_colors');
        speed_meter_colors.setScale(SPEED_METER_SCALE);
        speed_meter_colors.setAlpha(0.5);
        
        this.speed_meter_arrow = this.add.sprite(
            constants.CANVAS_WIDTH - SPEED_METER_COLORS_WIDTH / 2 + SPEED_METER_ARROWS_X_OFFSET,
            constants.CANVAS_HEIGHT,
            'speed_meter_arrow'
        );
        this.speed_meter_arrow.setScale(SPEED_METER_SCALE);
        this.speed_meter_arrow.setOrigin(0.5, 0.92);
        this.speed_meter_arrow.setAlpha(0.8);

        this.speed_meter = this.add.text(
            constants.CANVAS_WIDTH - SPEED_METER_COLORS_WIDTH / 2 - 8,
            constants.CANVAS_HEIGHT - SPEED_METER_COLORS_HEIGHT / 2 + 20, 
            '0 tps',
            { font: '36px Arial', fill: '#000000' });
        this.speed_meter.setOrigin(0.5, 0.5);
        
        this.leaderboard_background = this.add.rectangle(constants.CANVAS_WIDTH - 10, 10, 220, 160, 0xffffff, 0.5);
        this.leaderboard_background.setOrigin(1, 0);

        this.remaining_players = this.add.text(
            this.leaderboard_background.x - this.leaderboard_background.width + 20, 20, 
            'Remaining: 0', { font: '28px Arial', fill: '#000000' });

        this.leaderboard_rows = [];
        for (let i = 0; i < LEADERBOARD_TOP_SIZE; i++) {
            this.leaderboard_rows.push(this.add.text(
                this.leaderboard_background.x - this.leaderboard_background.width + 20, 56 + 26 * i, 
                '', { font: '24px Arial', fill: '#000000' }));
        }
        this.leaderboard_player_row = this.add.text(
            this.leaderboard_background.x - this.leaderboard_background.width + 20, LEADERBOARD_DEFAULT_PLAYER_ROW_Y, 
            '', { font: 'bold 24px Arial', fill: '#000000' });
    }

    update() {
        if (global_data.player.train) {
            this.speed_meter.setText(`${global_data.player.train.speed.toFixed(2)} tps`);
            let angle = SPEED_METER_ARROW_MIN_ANGLE + (SPEED_METER_ARROW_MAX_ANGLE - SPEED_METER_ARROW_MIN_ANGLE) * (global_data.player.train.speed - constants.MIN_SPEED) / (constants.MAX_SPEED - constants.MIN_SPEED);
            this.speed_meter_arrow.setAngle(angle);
        }

        let number_of_remaining_players = get_number_of_trains();
        this.remaining_players.setText(`Remaining: ${number_of_remaining_players}`);

        let rails = get_rails();
        let leaderboard_info = [];
        for (const route_id in rails) {
            leaderboard_info.push([route_id, rails[route_id].tiles.length]);
        }
        leaderboard_info.sort((a, b) => { return b[1] - a[1] })

        let player_rank = leaderboard_info.findIndex((a) => { return a[0] == global_data.player.train.route_id });
        let player_found_in_top = false;
        for (let i = 0; i < LEADERBOARD_TOP_SIZE; i++) {
            if (i >= number_of_remaining_players) {
                this.leaderboard_rows[i].setText('');
            }
            else {
                if (i == player_rank) {
                    this.leaderboard_rows[i].setText('');
                    this.leaderboard_player_row.y = this.leaderboard_rows[i].y;
                    this.leaderboard_player_row.setText(`${i + 1}. Player ${leaderboard_info[i][0]}: ${leaderboard_info[i][1]}`);
                    player_found_in_top = true;
                }
                else {
                    this.leaderboard_rows[i].setText(`${i + 1}. Player ${leaderboard_info[i][0]}: ${leaderboard_info[i][1]}`)
                }
            }
        }
        if (!player_found_in_top) {
            this.leaderboard_player_row.y = LEADERBOARD_DEFAULT_PLAYER_ROW_Y;
            this.leaderboard_player_row.setText(`${player_rank + 1}. Player ${leaderboard_info[player_rank][0]}: ${leaderboard_info[player_rank][1]}`);
        }
    }
}

module.exports = {
    GameOverlayScene: GameOverlayScene
}
