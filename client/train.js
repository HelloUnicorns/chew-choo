const constants = require('../common/constants.js');
const { GRID_PIECE_WIDTH, CART_Z_INEDX, LABELS_Z_INDEX } = require('./grid.js');

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

const TEXT_FONT = '18px Lucida Console';

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

class TrainCart {
    constructor(grid, train, is_engine) {
        this.x = 0;
        this.y = 0;
        this.grid_x = 0;
        this.grid_y = 0;
        this.train = train;
        this.is_engine = is_engine;
        this.grid_sprite = grid.create_grid_sprite(is_engine ? 'engine' : 'cart', 
                                                   sprite => this.on_sprite_create(sprite));
    }

    on_sprite_create(sprite) {
        let tint = this.train.is_own ? PLAYER_TRAIN_COLOR: this.train.is_bot ? BOT_TRAIN_COLOR : ENEMY_TRAIN_COLOR;
        sprite.setAlpha(this.train.alpha);
        sprite.setAngle(0);
        sprite.setScale(this.is_engine ? ENGINE_SCALE : CART_SCALE);
        sprite.setDepth(CART_Z_INEDX);
        sprite.setTint(tint, tint, tint, tint);
    }

    update(grid_x, grid_y, angle) {
        this.grid_x = grid_x;
        this.grid_y = grid_y;
        this.grid_sprite.update(grid_x, grid_y, (sprite, x, y) => {
            this.x = x;
            this.y = y;
            sprite.setPosition(x, y);
            sprite.setAngle(angle);
            sprite.setAlpha(this.train.alpha);
        });
    }

    destroy() {
        this.grid_sprite.destroy();
        this.grid_sprite = undefined;
    }
}

export class Train {
    constructor(scene, is_own, new_train, id, grid) {
        this.scene = scene;
        this.id = id;
        this.length = new_train.length;
        this.is_stopped = false;
        this.is_bot = new_train.is_bot;
        this.is_own = is_own;
        this.carts = [];
        for (let i = 0; i < this.length; i++) {
            this.carts.push(new TrainCart(grid, this, i == this.length - 1));
        }
        this.text = grid.create_grid_text(TEXT_FONT, text => this.on_text_create(text));
        this.blinking_interval = undefined;
        this.alpha = undefined;
        this.invincibility_state = undefined;
        this.update_invincibility(new_train.invincibility_state);
    }
    
    on_text_create(text) {
        text.setText(this.id);
        text.setOrigin(0.5, 0.5);
        text.setDepth(LABELS_Z_INDEX);
        text.setFill('black');
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

    update(active_tracks, next_track, fraction) {
        let tracks = active_tracks.concat([next_track]);
        
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
            let grid_x = track.x * (1 - fraction) + next_track.x * fraction;
            let grid_y = track.y * (1 - fraction) + next_track.y * fraction;
            let angle = track_angle * (1 - fraction) + next_track_angle * fraction;
            this.carts[cart_index].update(grid_x, grid_y, angle);
        });
        this.text.update(this.carts[this.carts.length - 1].grid_x, this.carts[this.carts.length - 1].grid_y, (text, x, y) => {
            text.setPosition(x - 30, y - 30);
        });
    }

    remove() {
        for (const cart of this.carts) {
            cart.destroy();
        }
        this.carts = [];
        if (this.text) {
            this.text.destroy();
            this.text = undefined;
        }
    }
}
