const constants = require('../common/constants.js');
const global_data = require('./global_data.js')
const { draw_grid_sprite, update_grid_sprite, GRID_PIECE_WIDTH, CART_Z_INEDX } = require('./grid.js');
const { get_rails_by_id } = require('./rails.js');

const CART_IMAGE_WIDTH = 100;
const CART_WIDTH = GRID_PIECE_WIDTH;
const CART_SCALE = CART_WIDTH / CART_IMAGE_WIDTH;

const ENGINE_IMAGE_WIDTH = 100;
const ENGINE_WIDTH = GRID_PIECE_WIDTH;
const ENGINE_SCALE = ENGINE_WIDTH / ENGINE_IMAGE_WIDTH;

const PLAYER_TRAIN_COLOR = 0x00ff00;
const ENEMY_TRAIN_COLOR = 0xff0000;


let trains = {}; /* trains by route ids */

function build_train(route_id) {
    return trains[route_id] = {
        sprites: [],
        position_in_route: 0,
        last_position_update: 0,
        length: 3,
        speed: constants.MIN_SPEED, /* in tiles per second */
        position_fraction: 0,
        route_id,
    };
}

function get_train_by_id(route_id) {
    return trains[route_id];
}

function draw_cart_by_index(train, cart_index, is_engine, is_own) {
    let rails = get_rails_by_id(train.route_id);
    position_in_route = (train.position_in_route - cart_index + rails.tiles.length) % rails.tiles.length;
    rail_tile = rails.tiles[position_in_route];
    angle = get_cart_angle_by_tile(rail_tile);
    cart_sprite = draw_cart(rail_tile.x, rail_tile.y, angle, is_engine, is_own);
    train.sprites.push(cart_sprite);
}

function get_cart_angle_by_tile(rail_tile) {
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

function draw_train(train, is_own) {
    draw_cart_by_index(train, 0, true, is_own);
    for (cart_index = 1; cart_index < train.length; cart_index++) {
        draw_cart_by_index(train, cart_index, false, is_own);
    }
}

function remove_train(route_id) {
    let train = get_train_by_id(route_id);
    if (!train) {
        return;
    }

    delete trains[route_id];
    for (let sprite of train.sprites) {
        sprite.destroy();
    }
}


function draw_all_trains(player_route_id) {
    for (let route_id in trains) {
        draw_train(trains[route_id], route_id == player_route_id);
    }
}

function draw_cart(grid_x, grid_y, angle, is_engine, is_own) {
    return draw_grid_sprite(
        grid_x, grid_y, angle, 
        is_engine ? 'engine' : 'cart', 
        is_engine ? ENGINE_SCALE : CART_SCALE, 
        CART_Z_INEDX, 
        is_own ? PLAYER_TRAIN_COLOR: ENEMY_TRAIN_COLOR);
}

function update_train(train) {
    let rails = get_rails_by_id(train.route_id);
    
    for (cart_index = 0; cart_index < train.length; cart_index++) {
        tile_index = (train.position_in_route - cart_index + rails.tiles.length) % rails.tiles.length;
        rail_tile = rails.tiles[tile_index];
        next_rail_tile = rails.tiles[(tile_index + 1) % rails.tiles.length];
        rail_angle = get_cart_angle_by_tile(rail_tile);
        next_rail_angle = get_cart_angle_by_tile(next_rail_tile);
        if (rail_angle > next_rail_angle) {
            next_rail_angle += 360;
        }
        position_x = rail_tile.x * (1 - train.position_fraction) + next_rail_tile.x * train.position_fraction;
        position_y = rail_tile.y * (1 - train.position_fraction) + next_rail_tile.y * train.position_fraction;
        angle = rail_angle * (1 - train.position_fraction) + next_rail_angle * train.position_fraction;
        update_grid_sprite(train.sprites[cart_index], position_x, position_y, angle);
    }
}

function update_trains() {
    for (const route_id in trains) {
        update_train(trains[route_id]);
    }
}

function update_train_location(route_id, position_fraction, position_in_route, speed) {
    trains[route_id].position_fraction = position_fraction;
    trains[route_id].position_in_route = position_in_route;
    trains[route_id].speed = speed;
    trains[route_id].last_position_update = global_data.scene.time.now;
}

exports.draw_all_trains = draw_all_trains;
exports.build_train = build_train;
exports.update_trains = update_trains;
exports.get_train_by_id = get_train_by_id;
exports.update_train_location = update_train_location;
exports.remove_train = remove_train;