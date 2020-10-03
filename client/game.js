const Phaser = require('phaser');
const { send_event, event_handlers } = require('./websockets.js');

const GRID_ORIGIN_X = 40;
const GRID_ORIGIN_Y = 40;

const GRID_PIECE_IMAGE_WIDTH = 100;
const TRACK_SCALE = 0.3;
const GRID_PIECE_WIDTH = GRID_PIECE_IMAGE_WIDTH * TRACK_SCALE;

const CART_IMAGE_WIDTH = 100;
const CART_WIDTH = GRID_PIECE_WIDTH;
const CART_SCALE = CART_WIDTH / CART_IMAGE_WIDTH;

const LOW_SPEED = 10;
const HIGH_SPEED = 30;

let game_inited = false;
let client_id;

let space_key;

let map = { 
    0: build_rectangular_route(0, 0, 30, 20), 
    1: build_rectangular_route(10, 10, 21, 11)
};

let player = {
    car_sprite: undefined,
    route: map[0],
    train_route: [],
    position_in_route: 0,
    last_position_update: 0,
    speed: 10 /* in tiles per second */
}

function build_rectangular_route(grid_x, grid_y, width, height) {
    route = [];
    for (let i = 1; i < width - 1; i++) {
        route.push({x: grid_x + i, y: grid_y, direction_from: 'left', direction_to: 'right'});
    }

    route.push({x: grid_x + width - 1, y: grid_y, direction_from: 'left', direction_to: 'bottom'});
    
    for (let i = 1; i < height - 1; i++) {
        route.push({x: grid_x + width - 1, y: grid_y + i, direction_from: 'top', direction_to: 'bottom'});
    }

    route.push({x: grid_x + width - 1, y: grid_y + height - 1, direction_from: 'top', direction_to: 'left'});
    
    for (let i = width - 2; i > 0; i--) {
        route.push({x: grid_x + i, y: grid_y + height - 1, direction_from: 'right', direction_to: 'left'});
    }
    
    route.push({x: grid_x, y: grid_y + height - 1, direction_from: 'right', direction_to: 'top'});
    
    for (let i = height - 2; i > 0; i--) {
        route.push({x: grid_x, y: grid_y + i, direction_from: 'bottom', direction_to: 'top'});
    }

    route.push({x: grid_x, y: grid_y, direction_from: 'bottom', direction_to: 'right'});

    return route;
}

function draw_rail_tile(scene, rail_tile) {
    if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'top') {
        draw_track_piece(scene, rail_tile.x, rail_tile.y, 270);
    } else if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'left') {
        draw_corner_piece(scene, rail_tile.x, rail_tile.y, 0);
    } else if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'right') {
        draw_corner_piece(scene, rail_tile.x, rail_tile.y, 270);
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'bottom') {
        draw_track_piece(scene, rail_tile.x, rail_tile.y, 90);
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'left') {
        draw_corner_piece(scene, rail_tile.x, rail_tile.y, 90);
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'right') {
        draw_corner_piece(scene, rail_tile.x, rail_tile.y, 180);
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'top') {
        draw_corner_piece(scene, rail_tile.x, rail_tile.y, 90);
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'bottom') {
        draw_corner_piece(scene, rail_tile.x, rail_tile.y, 0);
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'right') {
        draw_track_piece(scene, rail_tile.x, rail_tile.y, 0);
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'left') {
        draw_track_piece(scene, rail_tile.x, rail_tile.y, 180);
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'top') {
        draw_corner_piece(scene, rail_tile.x, rail_tile.y, 180);
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'bottom') {
        draw_corner_piece(scene, rail_tile.x, rail_tile.y, 270);
    }
}

function get_player_rotation(rail_tile) {
    if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'top') {
        return 270;
    } else if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'left') {
        return 225;
    } else if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'right') {
        return 305;
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'bottom') {
        return 90;
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'left') {
        return 135;
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'right') {
        return 45;
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'top') {
        return 305;
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'bottom') {
        return 45;
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'right') {
        return 0;
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'left') {
        return 180;
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'top') {
        return 225;
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'bottom') {
        return 135;
    }
}

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

function preload() {
    this.load.image('track', 'assets/track.png');
    this.load.image('turn', 'assets/turn.png');
    this.load.image('cart', 'assets/cart.png')
}

function update_grid_sprite(sprite, grid_x, grid_y, rotation_degrees) {
    sprite.setPosition(GRID_ORIGIN_X + grid_x * GRID_PIECE_WIDTH, GRID_ORIGIN_Y + grid_y * GRID_PIECE_WIDTH);
    sprite.setRotation(rotation_degrees * Phaser.Math.DEG_TO_RAD);
}

function draw_grid_sprite(scene, grid_x, grid_y, rotation_degrees, sprite_name, scale) {
    let grid_sprite = scene.add.sprite(0, 0, sprite_name);
    update_grid_sprite(grid_sprite, grid_x, grid_y, rotation_degrees);
    grid_sprite.setScale(scale);
    return grid_sprite;
}

function draw_track_piece(scene, grid_x, grid_y, rotation_degrees) {
    return draw_grid_sprite(scene, grid_x, grid_y, rotation_degrees, 'track', TRACK_SCALE);
}

function draw_corner_piece(scene, grid_x, grid_y, rotation_degrees) {
    return draw_grid_sprite(scene, grid_x, grid_y, rotation_degrees, 'turn', TRACK_SCALE);
}

function draw_cart(scene, grid_x, grid_y, rotation_degrees) {
    return draw_grid_sprite(scene, grid_x, grid_y, rotation_degrees, 'cart', CART_SCALE);
}

function place_car(scene) {
    player_rail_tile = player.route[player.position_in_route];
    angle = get_player_rotation(player_rail_tile);
    player.cart_sprite = draw_cart(scene, player_rail_tile.x, player_rail_tile.y, angle);
}

function create() {
    this.cameras.main.setBackgroundColor(0xf7f1da);
    
    for(const route_id in map) {
        for (const rail_tile of map[route_id]) {
            draw_rail_tile(this, rail_tile);
        }
    }

    place_car(this);
    space_key = this.input.keyboard.addKey('space');

    game_inited = true;
}

function advance_track() {
    player.position_in_route++;
    player.position_in_route %= player.route.length;
}

function update_player(scene) {
    player.speed = scene.input.keyboard.checkDown(space_key) ? HIGH_SPEED : LOW_SPEED;

    if (scene.time.now - player.last_position_update > 1000 / player.speed) {
        player.last_position_update = scene.time.now;
        advance_track();
    }
    player_rail_tile = player.route[player.position_in_route];
    angle = get_player_rotation(player_rail_tile);
    update_grid_sprite(player.cart_sprite, player_rail_tile.x, player_rail_tile.y, angle);
}

function update() {
    update_player(this);
}

event_handlers.connection = (event) => {
    client_id = event.client_id;
};
