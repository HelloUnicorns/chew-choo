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
}

function draw_track_piece(scene, origin_x, origin_y, index_x, index_y, rotation_degrees) {
    let track = scene.add.sprite(origin_x + index_x * TRACK_PIECE_WIDTH, origin_y + index_y * TRACK_PIECE_WIDTH, 'track');
    track.setRotation(rotation_degrees * Phaser.Math.DEG_TO_RAD);
}

function draw_corner_piece(scene, origin_x, origin_y, index_x, index_y, rotation_degrees) {
    let track = scene.add.sprite(origin_x + index_x * TRACK_PIECE_WIDTH, origin_y + index_y * TRACK_PIECE_WIDTH, 'turn');
    track.setRotation(rotation_degrees * Phaser.Math.DEG_TO_RAD);
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

function create() {
    draw_tracks(this, 100, 100);
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