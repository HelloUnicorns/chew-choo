const _ = require('lodash');
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

const LEADERBOARD_TOP_SIZE = 5;
const LEADERBOARD_DEFAULT_PLAYER_ROW_Y = 56 + 26 * LEADERBOARD_TOP_SIZE;

const LEADERBOARD_FONT = '20px Lucida Console';

class GameOverlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverlayScene' });
        this.game_scene = undefined;
    }

    preload() {
        this.load.image('speed_meter_colors', 'assets/speed_meter_colors.png');
        this.load.image('speed_meter_arrow', 'assets/speed_meter_arrow.png');
    }

    create(game_scene) {
        this.game_scene = game_scene;
        let speed_meter_colors = this.add.sprite(
            constants.CANVAS_WIDTH - SPEED_METER_COLORS_WIDTH / 2 - 10,
            constants.CANVAS_HEIGHT - SPEED_METER_COLORS_HEIGHT / 2,
            'speed_meter_colors');
        speed_meter_colors.setScale(SPEED_METER_SCALE);
        speed_meter_colors.setAlpha(0.5);
        
        this.speed_meter_arrow = this.add.sprite(
            constants.CANVAS_WIDTH - SPEED_METER_COLORS_WIDTH / 2 - 10 + SPEED_METER_ARROWS_X_OFFSET,
            constants.CANVAS_HEIGHT,
            'speed_meter_arrow'
        );
        this.speed_meter_arrow.setScale(SPEED_METER_SCALE);
        this.speed_meter_arrow.setOrigin(0.5, 0.92);
        this.speed_meter_arrow.setAlpha(0.8);

        this.speed_meter = this.add.text(
            constants.CANVAS_WIDTH - SPEED_METER_COLORS_WIDTH / 2 - 18,
            constants.CANVAS_HEIGHT - SPEED_METER_COLORS_HEIGHT / 2 + 20, 
            '0 tps',
            { font: '36px Lucida Console', fill: '#000000' });
        this.speed_meter.setOrigin(0.5, 0.5);
        
        this.leaderboard_background = this.add.rectangle(constants.CANVAS_WIDTH - 10, 10, 220, 210, 0xffffff, 0.9);
        this.leaderboard_background.setOrigin(1, 0);

        this.remaining_players = this.add.text(
            this.leaderboard_background.x - this.leaderboard_background.width + 20, 20, 
            'Remaining: 0', { font: LEADERBOARD_FONT, fill: '#000000' });

        this.leaderboard_rows_bots = [];
        this.leaderboard_rows_not_bots = [];
        for (let i = 0; i < LEADERBOARD_TOP_SIZE; i++) {
            this.leaderboard_rows_bots.push(this.add.text(
                this.leaderboard_background.x - this.leaderboard_background.width + 20, 56 + 26 * i, 
                '', { font: LEADERBOARD_FONT, fill: '#000000' }));
            this.leaderboard_rows_not_bots.push(this.add.text(
                this.leaderboard_background.x - this.leaderboard_background.width + 20, 56 + 26 * i, 
                '', { font: LEADERBOARD_FONT, fill: '#cc0000' }));
        }
        this.leaderboard_player_row = this.add.text(
            this.leaderboard_background.x - this.leaderboard_background.width + 20, LEADERBOARD_DEFAULT_PLAYER_ROW_Y, 
            '', { font: LEADERBOARD_FONT, fill: '#00cc00' });
    }

    get_leaderboard_text(player_name, player_rank, player_score) {
        return `${player_rank}.${player_name}:`.padEnd(13) + `${player_score}`;
    }

    update() {
        if (!this.game_scene.player_route) {
            return;
        }
        let speed = this.game_scene.player_route.speed;
        this.speed_meter.setText(`${speed.toFixed(1)} tps`);
        let angle = SPEED_METER_ARROW_MIN_ANGLE + (SPEED_METER_ARROW_MAX_ANGLE - SPEED_METER_ARROW_MIN_ANGLE) * (speed - constants.MIN_SPEED) / (constants.MAX_SPEED - constants.MIN_SPEED);
        this.speed_meter_arrow.setAngle(angle);
        
        let number_of_remaining_players = Object.keys(this.game_scene.routes).length;
        this.remaining_players.setText(`Remaining: ${number_of_remaining_players}`);
        let leaderboard_info = [];
        for (const [route_id, route] of Object.entries(this.game_scene.routes)) {
            leaderboard_info.push({ route_id, score: route.score });
        }
        leaderboard_info.sort((info_a, info_b) => { return info_b.score - info_a.score })

        let player_rank = leaderboard_info.findIndex((info) => { return info.route_id == this.game_scene.player_route.route_id });
        let player_found_in_top = false;
        for (let i = 0; i < LEADERBOARD_TOP_SIZE; i++) {
            if (i >= number_of_remaining_players) {
                this.leaderboard_rows_bots[i].setText('');
                this.leaderboard_rows_not_bots[i].setText('');
            }
            else {
                if (i == player_rank) {
                    this.leaderboard_rows_bots[i].setText('');
                    this.leaderboard_rows_not_bots[i].setText('');
                    this.leaderboard_player_row.y = this.leaderboard_rows_not_bots[i].y;
                    this.leaderboard_player_row.setText(this.get_leaderboard_text(leaderboard_info[i].route_id, i + 1, leaderboard_info[i].score));
                    player_found_in_top = true;
                }
                else {
                    if (this.game_scene.routes[leaderboard_info[i].route_id].is_bot) {
                        this.leaderboard_rows_bots[i].setText(this.get_leaderboard_text(leaderboard_info[i].route_id, i + 1, leaderboard_info[i].score));
                        this.leaderboard_rows_not_bots[i].setText('')
                    }
                    else {
                        this.leaderboard_rows_bots[i].setText('')
                        this.leaderboard_rows_not_bots[i].setText(this.get_leaderboard_text(leaderboard_info[i].route_id, i + 1, leaderboard_info[i].score));
                    }
                }
            }
        }
        if (!player_found_in_top) {
            if (leaderboard_info[player_rank]) {
                this.leaderboard_player_row.y = LEADERBOARD_DEFAULT_PLAYER_ROW_Y;
                this.leaderboard_player_row.setText(this.get_leaderboard_text(leaderboard_info[player_rank].route_id, player_rank + 1, leaderboard_info[player_rank].score));
            }
            else {
                this.leaderboard_player_row.setText('');
            }
        }
    }
}

module.exports = {
    GameOverlayScene: GameOverlayScene
}
