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

const PLAYER_TRAIN_COLOR = 0x00ff00;
const ENEMY_TRAIN_COLOR = 0xff0000;
const BOT_TRAIN_COLOR = 0xffff00;

const MINIMUM_BLINKING_ALPHA = 0.1;
const INVINCIBLE_TRAIN_ALPHA = 0.25;
const NORMAL_TRAIN_ALPHA = 1;

const BLINKING_INTERVAL_MS = 10;

let trains = {}; /* trains by route ids */

function build_train(route_id, server_player) {
    return trains[route_id] = {
        sprites: [],
        drawn: false,
        blinking_interval: undefined,
        alpha: INVINCIBLE_TRAIN_ALPHA,
        invincibility_state: constants.PLAYER_FULLY_INVISIBLE,
        position_in_route: server_player.position_in_route,
        last_position_update: performance.now(),
        length: server_player.length,
        is_speed_up: server_player.is_speed_up,
        is_speed_down: server_player.is_speed_down,
        speed: server_player.speed,
        position_fraction: server_player.position_fraction,
        server_shadow_train: undefined,
        acceleration: constants.DEFAULT_START_ACCELERATION,
        is_stopped: server_player.is_stopped,
        is_bot: server_player.is_bot,
        route_id,
    };
}

function start_blinking(train) {
    if (train.blinking_interval) {
        return;
    }

    let start_time = performance.now();
    train.blinking_interval = setInterval(()=> {
        let time = performance.now();
        let delta = (time - start_time) / 1000;
        train.alpha = ((1 - MINIMUM_BLINKING_ALPHA) / 2) * Math.sin(2 * Math.PI * delta + Math.PI) + (1 + MINIMUM_BLINKING_ALPHA) / 2;
    }, BLINKING_INTERVAL_MS);
}

function stop_blinking(train) {
    if (!train.blinking_interval) {
        return;
    }
    clearInterval(train.blinking_interval);
    train.alpha = NORMAL_TRAIN_ALPHA;
}

function get_number_of_trains() {
    return Object.keys(trains).length;
}

function get_train_by_id(route_id) {
    return trains[route_id];
}

function draw_cart_by_index(train, cart_index, is_engine, is_own) {
    let rails = get_rails_by_id(train.route_id);
    position_in_route = (train.position_in_route - cart_index + rails.tiles.length) % rails.tiles.length;
    rail_tile = rails.tiles[position_in_route];
    angle = get_cart_angle_by_tile(rail_tile);

    cart_sprite = draw_cart(rail_tile.x, rail_tile.y, angle, is_engine, is_own, train.is_bot, train.alpha);

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
    if (train.drawn) {
        return;
    }
    train.drawn = true;
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

function get_cart_color(is_own, is_bot) {
    return is_own ? PLAYER_TRAIN_COLOR: is_bot ? BOT_TRAIN_COLOR : ENEMY_TRAIN_COLOR;
}

function draw_all_trains(player_route_id) {
    for (let route_id in trains) {
        draw_train(trains[route_id], route_id == player_route_id);
    }
}

function draw_cart(grid_x, grid_y, angle, is_engine, is_own, is_bot, alpha) {
    let sprite = draw_grid_sprite(
        grid_x, grid_y, angle, 
        is_engine ? 'engine' : 'cart', 
        is_engine ? ENGINE_SCALE : CART_SCALE, 
        CART_Z_INEDX, 
        get_cart_color(is_own, is_bot),
        alpha);

    return sprite;
}

const t1 = 0.1;
const t2 = 0.1;

function my_delta_mod(number, mod) {
    return (((number % mod) + mod + mod/2) % mod) - mod/2;
}

function update_train_acceleration_fix(train, rails) {
    x_server = train.server_shadow_train.position_in_route + train.server_shadow_train.position_fraction;
    x_0 = train.position_in_route + train.position_fraction;
    delta_x = my_delta_mod(x_server + (train.server_shadow_train.speed * global_data.latency / 1000) - x_0, rails.tiles.length)
    train.acceleration = (train.server_shadow_train.speed + delta_x / t1 - train.speed) / t2;
}

function update_train(train) {
    let rails = get_rails_by_id(train.route_id);
    if (!rails) {
        console.error(`No rails for train in route ${train.route_id}`)
        return;
    }

    /* draw the drain if it isn't already drawn */
    draw_train(train);

    let current_time = window.performance.now();
    if (train.server_shadow_train) {
        update_train_acceleration_fix(train, rails);
    }
    calculate_speed_and_position(train, rails.tiles.length, current_time);

    let train_tint = get_cart_color(global_data.player.train.route_id == train.route_id, train.is_bot);

    for (cart_index = 0; cart_index < train.length; cart_index++) {
        tile_index = (train.position_in_route - cart_index + rails.tiles.length) % rails.tiles.length;
        rail_tile = rails.tiles[tile_index];
        next_rail_tile = rails.tiles[(tile_index + 1) % rails.tiles.length];
        rail_angle = get_cart_angle_by_tile(rail_tile);
        next_rail_angle = get_cart_angle_by_tile(next_rail_tile);
        if (rail_angle == 305 && next_rail_angle == 0) {
            next_rail_angle = 360;
        }
        else if (rail_angle == 0 && next_rail_angle == 305) {
            rail_angle = 360;
        }
        position_x = rail_tile.x * (1 - train.position_fraction) + next_rail_tile.x * train.position_fraction;
        position_y = rail_tile.y * (1 - train.position_fraction) + next_rail_tile.y * train.position_fraction;
        angle = rail_angle * (1 - train.position_fraction) + next_rail_angle * train.position_fraction;
        update_grid_sprite(train.sprites[cart_index], position_x, position_y, angle, train_tint, train.alpha);
    }
}

function update_trains() {
    for (const route_id in trains) {
        update_train(trains[route_id]);
    }
}


function update_server_train_state(route_id, server_location) {
    let cur_time = window.performance.now();
    let train = trains[route_id];

    if (!train) {
        train = build_train(route_id, server_location);
    }

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

    train.is_stopped = server_location.is_stopped;
    train.is_bot = server_location.is_bot;

    if (train.invincibility_state != server_location.invincibility_state) {
        stop_blinking(train);
        switch (server_location.invincibility_state) {
            case constants.PLAYER_NOT_INVINCIBLE:
                train.alpha = NORMAL_TRAIN_ALPHA;
                break;
            case constants.PLAYER_BLINKING:
                start_blinking(train);
                break;
            case constants.PLAYER_FULLY_INVISIBLE:
                train.alpha = INVINCIBLE_TRAIN_ALPHA;
                break;
            default:
                console.error('Server sent bad invincibility state');
                break;
        }
    
        train.invincibility_state = server_location.invincibility_state;
    }
        
    if (!train.server_shadow_train && global_data.latency != 0) {
        train.position_fraction = server_shadow_train.position_fraction;
        train.position_in_route = server_shadow_train.position_in_route;
        train.last_position_update = cur_time;
    }

    /* proceed client-side calculation */
    calculate_speed_and_position(train, rails.tiles.length, cur_time);

    if (global_data.latency != 0) {
        train.server_shadow_train = server_shadow_train;
    }
}

exports.draw_all_trains = draw_all_trains;
exports.build_train = build_train;
exports.update_trains = update_trains;
exports.get_train_by_id = get_train_by_id;
exports.update_server_train_state = update_server_train_state;
exports.remove_train = remove_train;
exports.get_number_of_trains = get_number_of_trains;
