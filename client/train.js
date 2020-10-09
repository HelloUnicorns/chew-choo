const constants = require('../common/constants.js');
const global_data = require('./global_data.js')
const { draw_grid_sprite, update_grid_sprite, GRID_PIECE_WIDTH, CART_Z_INEDX } = require('./grid.js');
const { calculate_speed_and_position } = require('../common/position.js');
const { get_tracks_by_player_id } = require('./routes.js');

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
export const INVINCIBLE_TRAIN_ALPHA = 0.25;
export const NORMAL_TRAIN_ALPHA = 1;

const BLINKING_INTERVAL_MS = 10;

export function build_train(route_id, server_player, is_own) {
    return {
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
        is_own
    };
}

export function start_blinking(train) {
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

export function stop_blinking(train) {
    if (!train.blinking_interval) {
        return;
    }
    clearInterval(train.blinking_interval);
    train.alpha = NORMAL_TRAIN_ALPHA;
}

function draw_cart_by_index(train, tracks, cart_index, is_engine) {
    let position_in_route = (train.position_in_route - cart_index + tracks.length) % tracks.length;
    let track = tracks[position_in_route];
    let angle = directions_to_cart_angle(track.direction_from, track.direction_to);

    let cart_sprite = draw_cart(track.x, track.y, angle, is_engine, train.is_own, train.is_bot, train.alpha);

    train.sprites.push(cart_sprite);
}

function directions_to_cart_angle(direction_from, direction_to) {
    if (direction_from == 'bottom' && direction_to == 'top') {
        return 270;
    } else if (direction_from == 'bottom' && direction_to == 'left') {
        return 225;
    } else if (direction_from == 'bottom' && direction_to == 'right') {
        return 305;
    } else if (direction_from == 'top' && direction_to == 'bottom') {
        return 90;
    } else if (direction_from == 'top' && direction_to == 'left') {
        return 135;
    } else if (direction_from == 'top' && direction_to == 'right') {
        return 45;
    } else if (direction_from == 'left' && direction_to == 'top') {
        return 305;
    } else if (direction_from == 'left' && direction_to == 'bottom') {
        return 45;
    } else if (direction_from == 'left' && direction_to == 'right') {
        return 0;
    } else if (direction_from == 'right' && direction_to == 'left') {
        return 180;
    } else if (direction_from == 'right' && direction_to == 'top') {
        return 225;
    } else if (direction_from == 'right' && direction_to == 'bottom') {
        return 135;
    }
    throw new Error('Cannot calculate cart angle');
}

export function draw_train(train, tracks) {
    if (train.drawn) {
        return;
    }
    train.drawn = true;
    draw_cart_by_index(train, tracks, 0, true);
    for (let cart_index = 1; cart_index < train.length; cart_index++) {
        draw_cart_by_index(train, tracks, cart_index, false);
    }
}

function get_cart_color(is_own, is_bot) {
    return is_own ? PLAYER_TRAIN_COLOR: is_bot ? BOT_TRAIN_COLOR : ENEMY_TRAIN_COLOR;
}

function draw_cart(grid_x, grid_y, angle, is_engine, is_own, is_bot, alpha) {
    return draw_grid_sprite(
        grid_x, grid_y, angle, 
        is_engine ? 'engine' : 'cart', 
        is_engine ? ENGINE_SCALE : CART_SCALE, 
        CART_Z_INEDX, 
        get_cart_color(is_own, is_bot),
        alpha);
}

const t1 = 0.1;
const t2 = 0.1;

function my_delta_mod(number, mod) {
    return (((number % mod) + mod + mod/2) % mod) - mod/2;
}

function update_train_acceleration_fix(train, track) {
    let x_server = train.server_shadow_train.position_in_route + train.server_shadow_train.position_fraction;
    let x_0 = train.position_in_route + train.position_fraction;
    let delta_x = my_delta_mod(x_server + (train.server_shadow_train.speed * global_data.latency / 1000) - x_0, track.length)
    train.acceleration = (train.server_shadow_train.speed + delta_x / t1 - train.speed) / t2;
}

export function update_train(train, tracks) {
    /* draw the drain if it isn't already drawn */
    draw_train(train);

    let current_time = window.performance.now();
    if (train.server_shadow_train) {
        update_train_acceleration_fix(train, tracks);
    }
    calculate_speed_and_position(train, tracks.length, current_time);

    let train_tint = get_cart_color(train.is_own, train.is_bot);

    for (let cart_index = 0; cart_index < train.length; cart_index++) {
        let tile_index = (train.position_in_route - cart_index + tracks.length) % tracks.length;
        let track = tracks[tile_index];
        let next_track = tracks[(tile_index + 1) % tracks.length];
        let track_angle = directions_to_cart_angle(track.direction_from, track.direction_to);
        let next_track_angle = directions_to_cart_angle(next_track.direction_from, next_track.direction_to);
        if (track_angle == 305 && next_track_angle == 0) {
            next_track_angle = 360;
        }
        else if (track_angle == 0 && next_track_angle == 305) {
            track_angle = 360;
        }
        let position_x = track.x * (1 - train.position_fraction) + next_track.x * train.position_fraction;
        let position_y = track.y * (1 - train.position_fraction) + next_track.y * train.position_fraction;
        let angle = track_angle * (1 - train.position_fraction) + next_track_angle * train.position_fraction;
        update_grid_sprite(train.sprites[cart_index], position_x, position_y, angle, train_tint, train.alpha);
    }
}
