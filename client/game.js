const Phaser = require('phaser');
const { send_event, event_handlers } = require('./websockets.js');

const GRID_ORIGIN_X = 40;
const GRID_ORIGIN_Y = 40;

const GRID_PIECE_IMAGE_WIDTH = 100;
const TRACK_SCALE = 0.3;
const GRID_PIECE_WIDTH = GRID_PIECE_IMAGE_WIDTH * TRACK_SCALE;
const TRACK_WIDTH = 30;
const TRACK_HEIGHT = 20;
const TRACK_AMOUNT = (TRACK_HEIGHT + TRACK_WIDTH) * 2 - 4;

const CART_IMAGE_WIDTH = 100;
const CART_WIDTH = GRID_PIECE_WIDTH;
const CART_SCALE = CART_WIDTH / CART_IMAGE_WIDTH;

let game_inited = false;
let client_id;
let player = {
    car_sprite: undefined,
    train_route: [],
    car_grid_index: 0
}

map = { 
    0: build_rectangular_route(0, 0, 30, 20), 
    1: build_rectangular_route(10, 10, 21, 11)
};

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
        draw_corner_piece(scene, rail_tile.x, rail_tile.y, 0)
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
        draw_corner_piece(scene, rail_tile.x, rail_tile.y, 0)
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
    console.log('drawing', sprite_name, 'rotation', rotation_degrees, 'at', grid_x, grid_y)
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

function track_id_to_grid_index(track_id) {
    if (track_id < TRACK_WIDTH - 1) {
        /* top row */
        return { x: track_id, y: 0, rotation_degrees: 0};
    } 
    track_id -= TRACK_WIDTH - 1;

    if (track_id < TRACK_HEIGHT - 1) {
        /* right culomn */
        return { x: TRACK_WIDTH - 1, y: track_id, rotation_degrees: 90 };
    }
    track_id -= TRACK_HEIGHT - 1;
    
    if (track_id < TRACK_WIDTH - 1) {
        /* bottom row */
        return { x: TRACK_WIDTH - 1 - track_id, y: TRACK_HEIGHT - 1, rotation_degrees: 180 };
    }
    track_id -= TRACK_WIDTH - 1;

    /* left culomn */
    return { x: 0, y: TRACK_HEIGHT - 1 - track_id, rotation_degrees: 270 };
}

function place_car(scene) {
    grid_index = track_id_to_grid_index(player.car_grid_index);
    player.cart_sprite = draw_cart(scene, grid_index.x, grid_index.y, grid_index.rotation_degrees);
}

function create() {
    this.cameras.main.setBackgroundColor(0xf7f1da);
    
    for(const route_id in map) {
        console.log('route id ', route_id)
        const route = map[route_id];
        console.log(route)
        for (const rail_tile of route) {
            console.log(rail_tile)
            draw_rail_tile(this, rail_tile);
        }
    }

    place_car(this);
    game_inited = true;
    this.time.addEvent({ delay: 1000 / 10, callback: advance_track, callbackScope: this, loop: true });
}

function advance_track() {
    player.car_grid_index++;
    player.car_grid_index %= TRACK_AMOUNT;
}

function update() {
    grid_index = track_id_to_grid_index(player.car_grid_index);
    update_grid_sprite(player.cart_sprite, grid_index.x, grid_index.y, grid_index.rotation_degrees);
}

event_handlers.connection = (event) => {
    client_id = event.client_id;
};
