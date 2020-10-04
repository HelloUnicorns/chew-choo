const constants = require('../common/constants.js');
const global_data = require('./global_data.js')
const { draw_grid_sprite, update_grid_sprite, GRID_PIECE_WIDTH, CART_Z_INEDX } = require('./grid.js');
const { calculate_speed_and_position } = require('../common/position.js');
const { get_rails_by_id } = require('./rails.js');

const CART_IMAGE_WIDTH = 100;
const CART_WIDTH = GRID_PIECE_WIDTH;
const CART_SCALE = CART_WIDTH / CART_IMAGE_WIDTH;

const ENGINE_IMAGE_WIDTH = 100;
const ENGINE_WIDTH = GRID_PIECE_WIDTH;
const ENGINE_SCALE = ENGINE_WIDTH / ENGINE_IMAGE_WIDTH;


let trains = {}; /* trains by route ids */

function build_train(route_id) {
    return trains[route_id] = {
        sprites: [],
        position_in_route: 0,
        last_position_update: 0,
        length: 3,
        is_speed_up: false,
        is_speed_down: false,
        speed: constants.MIN_SPEED, /* in tiles per second */
        position_fraction: 0,
        server_shadow_train: undefined,
        route_id,
    };
}

function get_train_by_id(route_id) {
    return trains[route_id];
}

function draw_cart_by_index(train, cart_index, is_engine) {
    let rails = get_rails_by_id(train.route_id);
    position_in_route = (train.position_in_route - cart_index + rails.tiles.length) % rails.tiles.length;
    rail_tile = rails.tiles[position_in_route];
    angle = get_rotation_by_tile(rail_tile);
    cart_sprite = draw_cart(rail_tile.x, rail_tile.y, angle, is_engine);
    train.sprites.push(cart_sprite);
}

function get_rotation_by_tile(rail_tile) {
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

function draw_train(train) {
    draw_cart_by_index(train, 0, true);
    for (cart_index = 1; cart_index < train.length; cart_index++) {
        draw_cart_by_index(train, cart_index, false);
    }
}

function draw_all_trains() {
    for (let route_id in trains) {
        draw_train(trains[route_id]);
    }
}

function draw_cart(grid_x, grid_y, rotation_degrees, is_engine) {
    return draw_grid_sprite(
        grid_x, grid_y, rotation_degrees, 
        is_engine ? 'engine' : 'cart', 
        is_engine ? ENGINE_SCALE : CART_SCALE, 
        CART_Z_INEDX, 
        0x00ff00);
}

function update_train(train) {
    let rails = get_rails_by_id(train.route_id);
    calculate_speed_and_position(train, rails, window.performance.now());
    let position_in_route = train.position_in_route;
    let position_fraction = train.position_fraction;
    if (train.server_shadow_train) {
        // calculate_speed_and_position(train.server_shadow_train, rails, window.performance.now());
        // position_in_route = train.server_shadow_train.position_in_route;
        // position_fraction = train.server_shadow_train.position_fraction;
    }


    for (cart_index = 0; cart_index < train.length; cart_index++) {
        tile_index = (position_in_route - cart_index + rails.tiles.length) % rails.tiles.length;
        rail_tile = rails.tiles[tile_index];
        next_rail_tile = rails.tiles[(tile_index + 1) % rails.tiles.length];
        rail_angle = get_rotation_by_tile(rail_tile);
        next_rail_angle = get_rotation_by_tile(next_rail_tile);
        if (rail_angle > next_rail_angle) {
            next_rail_angle += 360;
        }
        position_x = rail_tile.x * (1 - position_fraction) + next_rail_tile.x * position_fraction;
        position_y = rail_tile.y * (1 - position_fraction) + next_rail_tile.y * position_fraction;
        angle = rail_angle * (1 - position_fraction) + next_rail_angle * position_fraction;
        update_grid_sprite(train.sprites[cart_index], position_x, position_y, angle);
    }
}

function update_trains() {
    for (const route_id in trains) {
        update_train(trains[route_id]);
    }
}

count = 100;

function update_server_train_location(route_id, server_location) {
    let cur_time = window.performance.now();
    let train = trains[route_id];
    let rails = get_rails_by_id(train.route_id);
    let server_shadow_train = {
        position_fraction: server_location.position_fraction,
        position_in_route: server_location.position_in_route,
        speed: server_location.speed,
        is_speed_up: server_location.is_speed_up,
        is_speed_down: server_location.is_speed_down,
        last_position_update: cur_time,
        server_time: server_location.server_time,
    }
        
    if (!train.server_shadow_train && global_data.latency != 0) {
        train.position_fraction = server_shadow_train.position_fraction;
        train.position_in_route = server_shadow_train.position_in_route;
        train.last_position_update = cur_time;
    }
    
    /* proceed client-side calculation */
    calculate_speed_and_position(train, rails, cur_time);

    if (train.server_shadow_train && route_id == global_data.player.train.route_id) {
        if (count > 0) {
            count--;
            console.log('\n\n')
            console.log(`scene time ${cur_time}. last update ${train.server_shadow_train.last_position_update}. diff:  ${cur_time - train.server_shadow_train.last_position_update}`)
            console.log(`Server time ${server_location.server_time}. last server time ${train.server_shadow_train.server_time}. diff: ${server_location.server_time - train.server_shadow_train.server_time}`)
            console.log(`Previous server calculation: ${train.server_shadow_train.position_in_route + train.server_shadow_train.position_fraction}.\n`)
            calculate_speed_and_position(train.server_shadow_train, rails, cur_time);
            console.log(`Our calculation: ${train.position_in_route + train.position_fraction}.\n`)
            console.log(`Previous server calculation extrapolation: ${train.server_shadow_train.position_in_route + train.server_shadow_train.position_fraction}.\n`)
            console.log(`New server calculation: ${server_location.position_in_route + server_location.position_fraction}.\n`)
            console.log(`New server calculation adjusted: ${server_shadow_train.position_in_route + server_shadow_train.position_fraction}.\n`)
            console.log('\n\n')
        }
        let diff = Math.abs((train.position_in_route + train.position_fraction) - (train.server_shadow_train.position_in_route + train.server_shadow_train.position_fraction));
        if (diff >= 1.5 && diff < 30) {
            debugger;
        }
    }
    if (global_data.latency != 0) {
        train.server_shadow_train = server_shadow_train;
    }
}

exports.draw_all_trains = draw_all_trains;
exports.build_train = build_train;
exports.update_trains = update_trains;
exports.get_train_by_id = get_train_by_id;
exports.update_server_train_location = update_server_train_location;