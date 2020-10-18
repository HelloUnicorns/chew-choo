const constants = require('../common/constants.js');
const global_data = require('./global_data.js')
const { draw_grid_sprite, update_grid_sprite, GRID_PIECE_WIDTH, CART_Z_INEDX } = require('./grid.js');
const { calculate_speed_and_position } = require('../common/position.js');

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

const t1 = 0.1;
const t2 = 0.1;

export class Train {
    constructor(is_own) {
        this.position = 0;
        this.length = 3;
        this.speed = constants.MIN_SPEED; /* in tiles per second */
        this.is_speed_up = false;
        this.is_speed_down = false;
        this.is_stopped = false;
        this.is_bot = true;
        this.is_own = is_own;
        this.sprites = [];
        this.drawn = false;
        this.blinking_interval = undefined;
        this.alpha = INVINCIBLE_TRAIN_ALPHA;
        this.invincibility_state = constants.TRAIN_FULLY_INVISIBLE;
        this.last_position_update = performance.now();
        this.server_shadow_train = undefined;
        this.acceleration = constants.DEFAULT_START_ACCELERATION;
        this.route = undefined;
    }

    get position_int() {
        /* TODO: maybe move to round instead of floor? */
        return Math.floor(this.position);
    }

    get position_fraction() {
        return this.position - Math.floor(this.position);
    }

    set_route(route) {
        this.route = route;
    }

    start_blinking() {
        if (this.blinking_interval) {
            return;
        }
    
        let start_time = performance.now();
        this.blinking_interval = setInterval(()=> {
            let time = performance.now();
            let delta = (time - start_time) / 1000;
            this.alpha = ((1 - MINIMUM_BLINKING_ALPHA) / 2) * Math.sin(2 * Math.PI * delta + Math.PI) + (1 + MINIMUM_BLINKING_ALPHA) / 2;
        }, BLINKING_INTERVAL_MS);
    }

    stop_blinking() {
        if (!this.blinking_interval) {
            return;
        }
        clearInterval(this.blinking_interval);
        this.alpha = NORMAL_TRAIN_ALPHA;
    }

    static directions_to_cart_angle(direction_from, direction_to) {
        if (direction_from == constants.BOTTOM && direction_to == constants.TOP) {
            return 270;
        } else if (direction_from == constants.BOTTOM && direction_to == constants.LEFT) {
            return 225;
        } else if (direction_from == constants.BOTTOM && direction_to == constants.RIGHT) {
            return 305;
        } else if (direction_from == constants.TOP && direction_to == constants.BOTTOM) {
            return 90;
        } else if (direction_from == constants.TOP && direction_to == constants.LEFT) {
            return 135;
        } else if (direction_from == constants.TOP && direction_to == constants.RIGHT) {
            return 45;
        } else if (direction_from == constants.LEFT && direction_to == constants.TOP) {
            return 305;
        } else if (direction_from == constants.LEFT && direction_to == constants.BOTTOM) {
            return 45;
        } else if (direction_from == constants.LEFT && direction_to == constants.RIGHT) {
            return 0;
        } else if (direction_from == constants.RIGHT && direction_to == constants.LEFT) {
            return 180;
        } else if (direction_from == constants.RIGHT && direction_to == constants.TOP) {
            return 225;
        } else if (direction_from == constants.RIGHT && direction_to == constants.BOTTOM) {
            return 135;
        }
        throw new Error('Cannot calculate cart angle');
    }

    draw_cart_by_index(cart_index, is_engine) {
        let route_index = (this.position_int - cart_index + this.route.tracks.length) % this.route.tracks.length;
        let track = this.route.tracks[route_index];
        let angle = this.constructor.directions_to_cart_angle(track.direction_from, track.direction_to);

        let cart_sprite = draw_grid_sprite(
            track.x, track.y, angle, 
            is_engine ? 'engine' : 'cart', 
            is_engine ? ENGINE_SCALE : CART_SCALE, 
            CART_Z_INEDX, 
            this.get_cart_color(),
            this.alpha);
        this.sprites.push(cart_sprite);
    }

    draw() {
        if (this.drawn) {
            return;
        }
        this.draw_cart_by_index(0, true);
        for (let cart_index = 1; cart_index < this.length; cart_index++) {
            this.draw_cart_by_index(cart_index, false);
        }
        this.drawn = true;
    }


    get_cart_color() {
        return this.is_own ? PLAYER_TRAIN_COLOR: this.is_bot ? BOT_TRAIN_COLOR : ENEMY_TRAIN_COLOR;
    }

    
    static my_delta_mod(number, mod) {
        return (((number % mod) + mod + mod/2) % mod) - mod/2;
    }

    update_train_acceleration_fix(track_len) {
        let x_server = this.server_shadow_train.position;
        let delta_x = this.constructor.my_delta_mod(x_server + (this.server_shadow_train.speed * global_data.latency / 1000) - this.position, track_len)
        this.acceleration = (this.server_shadow_train.speed + delta_x / t1 - this.speed) / t2;
        if (Math.abs(this.acceleration) > 1500) {
            new Error('Acceleration too big');
        }
    }

    update() {
        /* draw the drain if it isn't already drawn */
        this.draw();

        let current_time = window.performance.now();
        if (this.server_shadow_train) {
            this.update_train_acceleration_fix(this.route.tracks.length);
        }

        calculate_speed_and_position(this, this.route.tracks.length, current_time);

        let train_tint = this.get_cart_color(this.is_own, this.is_bot);

        for (let cart_index = 0; cart_index < this.length; cart_index++) {
            let tile_index = (this.position_int - cart_index + this.route.tracks.length) % this.route.tracks.length;
            let track = this.route.tracks[tile_index];
            let next_track = this.route.tracks[(tile_index + 1) % this.route.tracks.length];
            let track_angle = this.constructor.directions_to_cart_angle(track.direction_from, track.direction_to);
            let next_track_angle = this.constructor.directions_to_cart_angle(next_track.direction_from, next_track.direction_to);
            if (track_angle == 305 && next_track_angle == 0) {
                next_track_angle = 360;
            }
            else if (track_angle == 0 && next_track_angle == 305) {
                track_angle = 360;
            }
            let position_x = track.x * (1 - this.position_fraction) + next_track.x * this.position_fraction;
            let position_y = track.y * (1 - this.position_fraction) + next_track.y * this.position_fraction;
            let angle = track_angle * (1 - this.position_fraction) + next_track_angle * this.position_fraction;
            update_grid_sprite(this.sprites[cart_index], position_x, position_y, angle, train_tint, this.alpha);
        }
    }

    update_server_train_state(server_location, new_route) {
        let cur_time = window.performance.now();

        let server_shadow_train = {
            position: server_location.position,
            speed: server_location.speed,
            is_speed_up: server_location.is_speed_up,
            is_speed_down: server_location.is_speed_down,
            last_position_update: cur_time,
        }

        this.length = server_location.length;
        this.is_stopped = server_location.is_stopped;
        this.is_bot = server_location.is_bot;

        if (this.invincibility_state != server_location.invincibility_state) {
            this.stop_blinking();
            switch (server_location.invincibility_state) {
                case constants.TRAIN_NOT_INVINCIBLE:
                    this.alpha = NORMAL_TRAIN_ALPHA;
                    break;
                case constants.TRAIN_BLINKING:
                    this.start_blinking();
                    break;
                case constants.TRAIN_FULLY_INVISIBLE:
                    this.alpha = INVINCIBLE_TRAIN_ALPHA;
                    break;
                default:
                    console.error('Server sent bad invincibility state');
                    break;
            }
        
            this.invincibility_state = server_location.invincibility_state;
        }
        
        if (global_data.latency == 0) {
            return;
        }

        if (!this.server_shadow_train || new_route) {
            this.position = server_shadow_train.position;
            this.last_position_update = cur_time;
        }

        this.server_shadow_train = server_shadow_train;
    }

}
