const Phaser = require('phaser');
const { send_event, event_handlers } = require('./websockets.js');

const TRACK_PIECE_WIDTH = 100;
const TRACK_WIDTH = 10;
const TRACK_HEIGHT = 5;
let game_inited = false;
let client_id;

function preload() {
    this.load.image('track', 'assets/track.png');
    this.load.image('turn', 'assets/turn.png');
    this.load.image('car', 'assests/car.jpg')
}

function draw_track_piece(scene, origin_x, origin_y, index_x, index_y, rotation_degrees) {
    let track = scene.add.sprite(origin_x + index_x * TRACK_PIECE_WIDTH, origin_y + index_y * TRACK_PIECE_WIDTH, 'track');
    track.setRotation(rotation_degrees * Phaser.Math.DEG_TO_RAD);
}

function draw_corner_piece(scene, origin_x, origin_y, index_x, index_y, rotation_degrees) {
    let track = scene.add.sprite(origin_x + index_x * TRACK_PIECE_WIDTH, origin_y + index_y * TRACK_PIECE_WIDTH, 'turn');
    track.setRotation(rotation_degrees * Phaser.Math.DEG_TO_RAD);
}

function draw_car(scene, origin_x, origin_y, index_x, index_y) {
    let car = scene.add.sprite(origin_x + index_x * TRACK_PIECE_WIDTH, origin_y + index_y * TRACK_PIECE_WIDTH, 'car');
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
    draw_corner_piece(scene, origin_x, origin_y, 0, 0, 0);
    draw_corner_piece(scene, origin_x, origin_y, 0, TRACK_HEIGHT - 1, 270);
    draw_corner_piece(scene, origin_x, origin_y, TRACK_WIDTH - 1, 0, 90);
    draw_corner_piece(scene, origin_x, origin_y, TRACK_WIDTH - 1, TRACK_HEIGHT - 1, 180);
}

function place_car(scene, origin_x, origin_y) {
    /* Select start position */
    let amount_of_tracks = (TRACK_HEIGHT + TRACK_WIDTH) * 2 - 4;
    let selected_track = Math.floor(Math.random() * amount_of_tracks);
    let position = undefined;
    if (selected_track < TRACK_WIDTH) {
        /* First row */
        position = [selected_track, 0];
    } else if (selected_track + TRACK_WIDTH > amount_of_tracks) {
        /* Last row */
        position = [amount_of_tracks - selected_track, TRACK_HEIGHT - 1]; 
    } else {
        /* Middle rows */
        position = [
            (selected_track % 2) * (TRACK_WIDTH - 1),
            Math.floor((selected_track - TRACK_WIDTH) / 2)
        ];
    }
    console.log(selected_track);
    console.log(position);
    draw_car(scene, origin_x, origin_y, position[0], position[1]);
}

function create() {
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