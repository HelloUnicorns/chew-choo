const Phaser = require('phaser');
const constants = require('../common/constants.js');
const global_data = require('./global_data.js')
const { send_event, event_handlers } = require('./websockets.js');
const { GRID_PIECE_WIDTH } = require('./grid.js');
const { set_rails, draw_rails } = require('./rails.js');
const { draw_train, build_train, update_trains } = require('./train.js');
const { calculate_position } = require('../common/position.js');
const { get_rails_by_id } = require('./rails.js');

const CANVAS_HEIGHT = 720;
const CANVAS_WIDTH = 1280;

const VERTICAL_GRID_TILES_PER_PLAYER_TRAIN_TILES = 2;

let game_inited = 0;
let game_inited_target = 2;

let player = {
    train: undefined,
    was_space_pressed: false,
}

let space_key = undefined;

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 200 }
        }
    },
    scene: {
        preload,
        create,
        update
    },
    
});

function preload() {
    this.load.image('track', 'assets/track.png');
    this.load.image('own_track', 'assets/own_track.png');
    this.load.image('turn', 'assets/turn.png');
    this.load.image('engine', 'assets/engine.png');
    this.load.image('cart', 'assets/cart.png');
    this.load.image('own_turn', 'assets/own_turn.png');
    this.load.audio('bg_music', 'assets/bg_music.mp3');
}


function create() {
    global_data.scene = this;
    game_inited += 1;
    client_loaded();
}

function update_camera() {
    const vertical_tiles = player.train.length * VERTICAL_GRID_TILES_PER_PLAYER_TRAIN_TILES;
    const wanted_height = vertical_tiles * GRID_PIECE_WIDTH;
    const zoom = Math.min(CANVAS_HEIGHT / wanted_height, 1);
    global_data.scene.cameras.main.setZoom(zoom);
}

function update_player() {
    let is_space_pressed = global_data.scene.input.keyboard.checkDown(space_key);
    if (player.was_space_pressed != is_space_pressed) {
        player.was_space_pressed = is_space_pressed;
        send_event({type: 'speed', value: is_space_pressed});
    }
    player.speed = is_space_pressed ? constants.HIGH_SPEED : constants.LOW_SPEED;

    calculate_position(player.train, get_rails_by_id(player.train.route_id), global_data.scene.time.now);
}

function update() {
    if (game_inited != game_inited_target) {
        return;
    }
    update_player();
    update_trains();
    update_camera();
}

event_handlers.connection = (event) => {
    set_rails(event.map);
    player.train = build_train(event.route_id);
    game_inited += 1;
    
    client_loaded();
};

event_handlers.position = (event) => {
    if (game_inited != game_inited_target) {
        return;
    }
    let own_player_data = event.locations[player.train.route_id];
    player.train.position_fraction = own_player_data.position_fraction;
    player.train.position_in_route = own_player_data.position_in_route;
    player.train.last_position_update = global_data.scene.time.now;
};

function start_music() {
    bg_music = global_data.scene.sound.add('bg_music', { loop: true });
    bg_music.play();
    mute_key = global_data.scene.input.keyboard.addKey('m');
    mute_key.on('down', function(event) { bg_music.mute = !bg_music.mute; });
}

function draw_map() {
    global_data.scene.cameras.main.setBackgroundColor(0xf7f1da);
    
    draw_rails(player.train);
    draw_train(player.train);
    global_data.scene.cameras.main.startFollow(player.train.sprites[0], true);
    space_key = global_data.scene.input.keyboard.addKey('space');
}

function client_loaded() {
    if (game_inited != game_inited_target) {
        return;
    }

    start_music();
    draw_map();
}
