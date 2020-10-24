const constants = require('../common/constants.js');
const global_data = require('./global_data.js')
const { draw_grid_sprite, update_grid_sprite, GRID_PIECE_WIDTH, CART_Z_INEDX, LABELS_Z_INDEX } = require('./grid.js');

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
    constructor(is_own, new_train, id) {
        this.id = id;
        this.length = new_train.length;
        this.is_stopped = false;
        this.is_bot = new_train.is_bot;
        this.is_own = is_own;
        this.sprites = [];
        this.text = undefined;
        this.drawn = false;
        this.blinking_interval = undefined;
        this.alpha = undefined;
        this.invincibility_state = undefined;
        this.update_invincibility(new_train.invincibility_state);
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

    draw_cart(is_engine, track) {
        let cart_sprite = draw_grid_sprite(
            track.x, track.y, DIRECTION_TO_CART_ANGLE[track.direction], 
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
        for (const [cart_index, track] of Object.entries(active_tracks)) {
            this.draw_cart(cart_index == active_tracks.length - 1, track);
        }
        this.text = global_data.game_scene.add.text(0, 0, this.id, { font: '18px Arial', fill: '#000000' });
        this.text.setOrigin(0.5, 0.5);
        this.text.setDepth(LABELS_Z_INDEX);
        this.update_text();
        this.drawn = true;
    }

    get_cart_color() {
        return this.is_own ? PLAYER_TRAIN_COLOR: this.is_bot ? BOT_TRAIN_COLOR : ENEMY_TRAIN_COLOR;
    }

    update_text() {
        this.text.setPosition(this.sprites[this.sprites.length - 1].x - 30, this.sprites[this.sprites.length - 1].y - 30);
    }

    update(active_tracks, next_track, fraction) {
        let tracks = active_tracks.concat([next_track]);

        /* draw the train if it isn't already drawn */
        this.draw(active_tracks);
       
        let train_tint = this.get_cart_color(this.is_own, this.is_bot);
        active_tracks.forEach((track, cart_index) => { 
            let next_track = tracks[cart_index + 1];
            let track_angle = DIRECTION_TO_CART_ANGLE[track.direction];
            let next_track_angle = DIRECTION_TO_CART_ANGLE[next_track.direction];
            if (track_angle == 305 && next_track_angle == 0) {
                next_track_angle = 360;
            }
            else if (track_angle == 0 && next_track_angle == 305) {
                track_angle = 360;
            }
            let position_x = track.x * (1 - fraction) + next_track.x * fraction;
            let position_y = track.y * (1 - fraction) + next_track.y * fraction;
            let angle = track_angle * (1 - fraction) + next_track_angle * fraction;
            update_grid_sprite(this.sprites[cart_index], position_x, position_y, angle, train_tint, this.alpha);
        });
        this.update_text();
    }

    remove() {
        for (const sprite of this.sprites) {
            sprite.destroy();
        }
        this.sprites = [];
        if (this.text) {
            this.text.destroy();
            this.text = undefined;
        }
    }
}
