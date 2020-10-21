const constants = require('../common/constants.js');
const global_data = require('./global_data.js')
const { draw_grid_sprite, update_grid_sprite, GRID_PIECE_WIDTH, CART_Z_INEDX } = require('./grid.js');
const { calculate_end_speed_and_position, my_delta_mod } = require('../common/position.js');

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

const DIRECTION_TO_CART_ANGLE = {
    [constants.Direction.BOTTOM_TO_TOP]: 270,
    [constants.Direction.BOTTOM_TO_LEFT]: 225,
    [constants.Direction.BOTTOM_TO_RIGHT]: 305,
    [constants.Direction.TOP_TO_BOTTOM]: 90,
    [constants.Direction.TOP_TO_LEFT]: 135,
    [constants.Direction.TOP_TO_RIGHT]: 45,
    [constants.Direction.LEFT_TO_TOP]: 305,
    [constants.Direction.LEFT_TO_BOTTOM]: 45,
    [constants.Direction.LEFT_TO_RIGHT]: 0,
    [constants.Direction.RIGHT_TO_LEFT]: 180,
    [constants.Direction.RIGHT_TO_TOP]: 225,
    [constants.Direction.RIGHT_TO_BOTTOM]: 135,
};

export class Train {
    constructor(is_own, new_train) {
        this.position = 0;
        this.speed = 0;
        this.length = new_train.length;
        this.is_speed_up = false;
        this.is_speed_down = false;
        this.is_stopped = false;
        this.is_bot = new_train.is_bot;
        this.is_own = is_own;
        this.sprites = [];
        this.drawn = false;
        this.blinking_interval = undefined;
        this.alpha = undefined;
        this.invincibility_state = undefined;
        this.update_invincibility(new_train.invincibility_state);
        this.latest_speed_update = new_train.latest_speed_update;
    }

    update_invincibility(new_invincibility_state) {
        if (this.invincibility_state != new_invincibility_state) {
            this.stop_blinking();
            switch (new_invincibility_state) {
                case constants.InvincibilityState.TRAIN_NOT_INVINCIBLE:
                    this.alpha = NORMAL_TRAIN_ALPHA;
                    break;
                case constants.InvincibilityState.TRAIN_BLINKING:
                    this.alpha = MINIMUM_BLINKING_ALPHA;
                    this.start_blinking();
                    break;
                case constants.InvincibilityState.TRAIN_FULLY_INVISIBLE:
                    this.alpha = INVINCIBLE_TRAIN_ALPHA;
                    break;
                default:
                    throw new Error('Server sent bad invincibility state');
            }
        
            this.invincibility_state = new_invincibility_state;
        }
    }

    get position_int() {
        /* TODO: maybe move to round instead of floor? */
        return Math.floor(this.position);
    }

    get position_fraction() {
        return this.position - Math.floor(this.position);
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

    draw_cart_by_index(cart_index, is_engine, active_tracks) {
        let route_index = (this.position_int - cart_index + active_tracks.length) % active_tracks.length;
        let track = active_tracks[route_index];
        let angle = DIRECTION_TO_CART_ANGLE[track.direction];

        let cart_sprite = draw_grid_sprite(
            track.x, track.y, angle, 
            is_engine ? 'engine' : 'cart', 
            is_engine ? ENGINE_SCALE : CART_SCALE, 
            CART_Z_INEDX, 
            this.get_cart_color(),
            this.alpha);
        this.sprites.push(cart_sprite);
    }

    draw(active_tracks) {
        if (this.drawn) {
            return;
        }
        this.draw_cart_by_index(0, true, active_tracks);
        for (let cart_index = 1; cart_index < this.length; cart_index++) {
            this.draw_cart_by_index(cart_index, false, active_tracks);
        }
        this.drawn = true;
    }

    get_cart_color() {
        return this.is_own ? PLAYER_TRAIN_COLOR: this.is_bot ? BOT_TRAIN_COLOR : ENEMY_TRAIN_COLOR;
    }

    update(server_time, active_tracks) {
        /* draw the drain if it isn't already drawn */
        this.draw(active_tracks);

        const { end_position, end_speed } = calculate_end_speed_and_position(this.latest_speed_update, server_time - this.latest_speed_update.update_time, active_tracks.length);
        this.speed = end_speed;
        this.position = end_position;
       
        let train_tint = this.get_cart_color(this.is_own, this.is_bot);

        for (let cart_index = 0; cart_index < this.length; cart_index++) {
            let tile_index = (this.position_int - cart_index + active_tracks.length) % active_tracks.length;
            let track = active_tracks[tile_index];
            let next_track = active_tracks[(tile_index + 1) % active_tracks.length];
            let track_angle = DIRECTION_TO_CART_ANGLE[track.direction];
            let next_track_angle = DIRECTION_TO_CART_ANGLE[next_track.direction];
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

    update_latest_speed_update(new_latest_speed_update) {
        this.latest_speed_update = new_latest_speed_update;
    }
}
