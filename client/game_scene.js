const global_data = require('./global_data.js');
const { send_event } = require('./websockets.js');
const constants = require('../common/constants.js');
const { GRID_PIECE_WIDTH } = require('./grid.js');
const { draw_rails } = require('./rails.js');
const { update_trains, draw_all_trains } = require('./train.js');

const VERTICAL_GRID_TILES_PER_PLAYER_TRAIN_TILES = 2;

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        
        global_data.game_scene = this;

        this.game_inited = 0;
        this.game_inited_target = 2;
        this.up_key = undefined;
        this.down_key = undefined;

    }

    preload() {
        this.load.image('track', 'assets/track.png');
        this.load.image('own_track', 'assets/own_track.png');
        this.load.image('turn', 'assets/turn.png');
        this.load.image('engine', 'assets/engine.png');
        this.load.image('cart', 'assets/cart.png');
        this.load.image('own_turn', 'assets/own_turn.png');
        this.load.audio('bg_music', 'assets/bg_music.mp3');
    }

    start_music() {
        this.bg_music = this.sound.add('bg_music', { loop: true });
        this.bg_music.play();
        let mute_key = this.input.keyboard.addKey('m');
        mute_key.on('down', function(event) { global_data.game_scene.bg_music.mute = !global_data.game_scene.bg_music.mute; });
    }

    draw_map() {
        this.cameras.main.setBackgroundColor(0xf7f1da);
        
        draw_rails(global_data.player.train.route_id);
        draw_all_trains(global_data.player.train.route_id);
        this.cameras.main.startFollow(global_data.player.train.sprites[0], true);
        this.up_key = this.input.keyboard.addKey('up');
        this.down_key = this.input.keyboard.addKey('down');
    }

    resume_player_train() {
        send_event({type: 'resume_player'});
    }

    client_loaded() {
        if (this.game_inited != this.game_inited_target) {
            return;
        }
    
        this.start_music();
        this.draw_map();
        this.resume_player_train();
    }

    create() {
        this.game_inited += 1;
        this.client_loaded();
    }

    get_speed_message_value(is_speed_up, is_speed_down) {
        return is_speed_up * constants.SPEED_UP_FLAG + is_speed_down * constants.SPEED_DOWN_FLAG;
    }

    update_speed_change() {
        let is_up_pressed = this.input.keyboard.checkDown(this.up_key);
        if (global_data.player.train.is_speed_up != is_up_pressed) {
            global_data.player.train.is_speed_up = is_up_pressed;
            send_event({type: 'speed_change', value: this.get_speed_message_value(is_up_pressed, global_data.player.train.is_speed_down)});
        }
        let is_down_pressed = this.input.keyboard.checkDown(this.down_key);
        if (global_data.player.train.is_speed_down != is_down_pressed) {
            global_data.player.train.is_speed_down = is_down_pressed;
            send_event({type: 'speed_change', value: this.get_speed_message_value(global_data.player.train.is_speed_up, is_down_pressed)});
        }
    }

    update_player() {
        this.update_speed_change();
    }

    update_camera() {
        const vertical_tiles = global_data.player.train.length * VERTICAL_GRID_TILES_PER_PLAYER_TRAIN_TILES;
        const wanted_height = vertical_tiles * GRID_PIECE_WIDTH;
        const zoom = Math.min(constants.CANVAS_HEIGHT / wanted_height, 1);
        this.cameras.main.setZoom(zoom);
    }

    update() {
        if (this.game_inited != this.game_inited_target) {
            return;
        }
        this.update_player();
        update_trains();
        this.update_camera();
    }
}

module.exports = {
    GameScene: GameScene
}
