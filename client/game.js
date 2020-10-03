const Phaser = require('phaser');
const { send_event, event_handlers } = require('./websockets.js');

const CANVAS_HEIGHT = 720;
const CANVAS_WIDTH = 1280;

const VERTICAL_GRID_TILES_PER_PLAYER_TRAIN_TILES = 2;
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

const ENGINE_IMAGE_WIDTH = 100;
const ENGINE_WIDTH = GRID_PIECE_WIDTH;
const ENGINE_SCALE = ENGINE_WIDTH / ENGINE_IMAGE_WIDTH;

let game_inited = 0;
let game_inited_target = 2;
let client_id;

let map = undefined;
let scene = undefined;
let player = {
    cart_sprites: [],
    position_in_route: 0,
    last_position_update: 0,
    length: 3,
    speed: LOW_SPEED, /* in tiles per second */
    was_space_pressed: false,
    position_fraction: 0,
    route_id: 0
}
let space_key;

function draw_rail_tile(rail_tile, is_own) {
    if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'top') {
        draw_track_piece(rail_tile.x, rail_tile.y, 270, is_own);
    } else if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'left') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 0, is_own);
    } else if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'right') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 270, is_own);
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'bottom') {
        draw_track_piece(rail_tile.x, rail_tile.y, 90, is_own);
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'left') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 90, is_own);
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'right') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 180, is_own);
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'top') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 90, is_own);
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'bottom') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 0, is_own);
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'right') {
        draw_track_piece(rail_tile.x, rail_tile.y, 0, is_own);
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'left') {
        draw_track_piece(rail_tile.x, rail_tile.y, 180, is_own);
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'top') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 180, is_own);
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'bottom') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 270, is_own);
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
}

function update_grid_sprite(sprite, grid_x, grid_y, rotation_degrees) {
    sprite.setPosition(GRID_ORIGIN_X + grid_x * GRID_PIECE_WIDTH, GRID_ORIGIN_Y + grid_y * GRID_PIECE_WIDTH);
    sprite.setRotation(rotation_degrees * Phaser.Math.DEG_TO_RAD);
}

function draw_grid_sprite(grid_x, grid_y, rotation_degrees, sprite_name, scale) {
    let grid_sprite = scene.add.sprite(0, 0, sprite_name);
    update_grid_sprite(grid_sprite, grid_x, grid_y, rotation_degrees);
    grid_sprite.setScale(scale);
    return grid_sprite;
}

function draw_track_piece(grid_x, grid_y, rotation_degrees, is_own) {
    return draw_grid_sprite(grid_x, grid_y, rotation_degrees, is_own ? 'own_track' : 'track', TRACK_SCALE);
}

function draw_corner_piece(grid_x, grid_y, rotation_degrees, is_own) {
    return draw_grid_sprite(grid_x, grid_y, rotation_degrees, is_own ? 'own_turn' : 'turn', TRACK_SCALE);
}

function draw_cart(grid_x, grid_y, rotation_degrees, is_engine) {
    return draw_grid_sprite(grid_x, grid_y, rotation_degrees, is_engine ? 'engine' : 'cart', CART_SCALE);
}

function draw_cart_by_index(cart_index, is_engine) {
    position_in_route = (player.position_in_route - cart_index + map[player.route_id].tiles.length) % map[player.route_id].tiles.length;
    rail_tile = map[player.route_id].tiles[position_in_route];
    angle = get_player_rotation(rail_tile);
    cart_sprite = draw_cart(rail_tile.x, rail_tile.y, angle, is_engine);
    player.cart_sprites.push(cart_sprite);
}

function draw_train() {
    draw_cart_by_index(0, true);
    for (cart_index = 1; cart_index < player.length; cart_index++) {
        draw_cart_by_index(cart_index, false);
    }
}

function update_player() {
    let is_space_pressed = scene.input.keyboard.checkDown(space_key);
    if (player.was_space_pressed != is_space_pressed) {
        player.was_space_pressed = is_space_pressed;
        send_event({type: 'speed', value: is_space_pressed});
    }
    player.speed = is_space_pressed ? HIGH_SPEED : LOW_SPEED;

    player.position_fraction += player.speed * (scene.time.now - player.last_position_update) / 1000;
    player.last_position_update = scene.time.now;
    if (player.position_fraction >= 1) {
        position_in_route_change = Math.floor(player.position_fraction);
        player.position_in_route += position_in_route_change;
        player.position_in_route %= map[player.route_id].tiles.length;
        player.position_fraction -= position_in_route_change;
    }

    for (cart_index = 0; cart_index < player.length; cart_index++) {
        tile_index = (player.position_in_route - cart_index + map[player.route_id].tiles.length) % map[player.route_id].tiles.length;
        rail_tile = map[player.route_id].tiles[tile_index];
        next_rail_tile = map[player.route_id].tiles[(tile_index + 1) % map[player.route_id].tiles.length];
        rail_angle = get_player_rotation(rail_tile);
        next_rail_angle = get_player_rotation(next_rail_tile);
        if (rail_angle > next_rail_angle) {
            next_rail_angle += 360;
        }
        position_x = rail_tile.x * (1 - player.position_fraction) + next_rail_tile.x * player.position_fraction;
        position_y = rail_tile.y * (1 - player.position_fraction) + next_rail_tile.y * player.position_fraction;
        angle = rail_angle * (1 - player.position_fraction) + next_rail_angle * player.position_fraction;
        update_grid_sprite(player.cart_sprites[cart_index], position_x, position_y, angle);
    }
}

function create() {
    scene = this;
    game_inited += 1;
    draw_map();
}

function update_camera() {
    const vertical_tiles = player.length * VERTICAL_GRID_TILES_PER_PLAYER_TRAIN_TILES;
    const wanted_height = vertical_tiles * GRID_PIECE_WIDTH;
    const zoom = Math.min(CANVAS_HEIGHT / wanted_height, 1);
    scene.cameras.main.setZoom(zoom);
}

function update() {
    if (game_inited != game_inited_target) {
        return;
    }
    update_player();
    update_camera();
}

event_handlers.connection = (event) => {
    client_id = event.client_id;
    map = event.map;
    player.route_id = event.route_id;
    game_inited += 1;
    
    draw_map();
};

event_handlers.position = (event) => {
    if (game_inited != game_inited_target) {
        return;
    }

    player.position_fraction = event.position_fraction;
    player.position_in_route = event.position;
    player.last_position_update = scene.time.now;
};

function draw_map() {
    if (game_inited != game_inited_target) {
        return;
    }
    scene.cameras.main.setBackgroundColor(0xf7f1da);
    
    for(const route_id in map) {
        for (const rail_tile of map[route_id].tiles) {
            draw_rail_tile(rail_tile, player.route_id == route_id);
        }
    }

    draw_train();
    scene.cameras.main.startFollow(player.cart_sprites[0], true);
    space_key = scene.input.keyboard.addKey('space');
}
