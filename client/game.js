const Phaser = require('phaser');
const { send_event, event_handlers } = require('./websockets.js');

const TRACK_PIECE_IMAGE_WIDTH = 100;
const TRACK_SCALE = 0.3;
const TRACK_PIECE_WIDTH = TRACK_PIECE_IMAGE_WIDTH * TRACK_SCALE;
const TRACK_WIDTH = 30;
const TRACK_HEIGHT = 20;

const CART_IMAGE_WIDTH = 100;
const CART_WIDTH = TRACK_PIECE_WIDTH;
const CART_SCALE = CART_WIDTH / CART_IMAGE_WIDTH;


let game_inited = false;
let client_id;

function preload() {
    this.load.image('track', 'assets/track.png');
    this.load.image('turn', 'assets/turn.png');
    this.load.image('cart', 'assets/cart.png')
}

function draw_track_piece(scene, origin_x, origin_y, index_x, index_y, rotation_degrees) {
    let track = scene.add.sprite(origin_x + index_x * TRACK_PIECE_WIDTH, origin_y + index_y * TRACK_PIECE_WIDTH, 'track');
    track.setRotation(rotation_degrees * Phaser.Math.DEG_TO_RAD);
    track.setScale(TRACK_SCALE);
}

function draw_corner_piece(scene, origin_x, origin_y, index_x, index_y, rotation_degrees) {
    let track = scene.add.sprite(origin_x + index_x * TRACK_PIECE_WIDTH, origin_y + index_y * TRACK_PIECE_WIDTH, 'turn');
    track.setRotation(rotation_degrees * Phaser.Math.DEG_TO_RAD);
    track.setScale(TRACK_SCALE);
}

function draw_cart(scene, origin_x, origin_y, index_x, index_y, rotation_degrees) {
    let cart = scene.add.sprite(origin_x + index_x * TRACK_PIECE_WIDTH, origin_y + index_y * TRACK_PIECE_WIDTH, 'cart');
    cart.setRotation(rotation_degrees * Phaser.Math.DEG_TO_RAD);
    cart.setScale(CART_SCALE);
}

function draw_tracks(scene, origin_x, origin_y) {
    for (let i = 1; i < TRACK_WIDTH - 1; i++) {
        draw_track_piece(scene, origin_x, origin_y, i, 0, 0);
        draw_track_piece(scene, origin_x, origin_y, i, TRACK_HEIGHT - 1, 180);
    }
    for (let i = 1; i < TRACK_HEIGHT - 1; i++) {
        draw_track_piece(scene, origin_x, origin_y, 0, i, 270);
        draw_track_piece(scene, origin_x, origin_y, TRACK_WIDTH - 1, i, 90);
    }
    draw_corner_piece(scene, origin_x, origin_y, 0, 0, 270);
    draw_corner_piece(scene, origin_x, origin_y, 0, TRACK_HEIGHT - 1, 180);
    draw_corner_piece(scene, origin_x, origin_y, TRACK_WIDTH - 1, 0, 0);
    draw_corner_piece(scene, origin_x, origin_y, TRACK_WIDTH - 1, TRACK_HEIGHT - 1, 90);
}

function place_car(scene, origin_x, origin_y) {
    /* Select start position */
    let amount_of_tracks = (TRACK_HEIGHT + TRACK_WIDTH) * 2 - 4;
    let selected_track = Math.floor(Math.random() * amount_of_tracks);
    let position = undefined;
    if (selected_track < TRACK_WIDTH) {
        /* First row */
        position = [selected_track, 0];
        rotation_degrees = 0;
    } else if (selected_track + TRACK_WIDTH > amount_of_tracks) {
        /* Last row */
        position = [amount_of_tracks - selected_track, TRACK_HEIGHT - 1];
        rotation_degrees = 180;
    } else {
        /* Middle rows */
        position = [
            (selected_track % 2) * (TRACK_WIDTH - 1),
            Math.floor((selected_track - TRACK_WIDTH) / 2)
        ];
        rotation_degrees = 270 - 180 * (selected_track % 2);
    }
    console.log(selected_track);
    console.log(position);
    draw_cart(scene, origin_x, origin_y, position[0], position[1], rotation_degrees);
}

function create() {
    this.cameras.main.setBackgroundColor(0xf7f1da)
    draw_tracks(this, 100, 100);
    place_car(this, 100, 100);
    game_inited = true;
}

function update() {

}

event_handlers.connection = (event) => {
    client_id = event.client_id;
};

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1280,
    height: 720,
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