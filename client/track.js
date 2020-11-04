const assert = require('assert');
const constants = require('../common/constants.js');
const { direction_to_direction_components, direction_from_direction_components } = require('../common/utils.js');
const { TRACK_SCALE, NORMAL_TRACK_Z_INDEX, OWN_TRACK_Z_INEDX } = require('./grid.js');

const DIRECTION_TO_PIECE_ORIENTATION = {
    [constants.Direction.BOTTOM_TO_TOP]: { is_corner: false, angle: 270 },
    [constants.Direction.BOTTOM_TO_LEFT]: { is_corner: true, angle: 0 },
    [constants.Direction.BOTTOM_TO_RIGHT]: { is_corner: true, angle: 270 },
    [constants.Direction.TOP_TO_BOTTOM]: { is_corner: false, angle: 90 },
    [constants.Direction.TOP_TO_LEFT]: { is_corner: true, angle: 90 },
    [constants.Direction.TOP_TO_RIGHT]: { is_corner: true, angle: 180 },
    [constants.Direction.LEFT_TO_TOP]: { is_corner: true, angle: 90 },
    [constants.Direction.LEFT_TO_BOTTOM]: { is_corner: true, angle: 0 },
    [constants.Direction.LEFT_TO_RIGHT]: { is_corner: false, angle: 0 },
    [constants.Direction.RIGHT_TO_LEFT]: { is_corner: false, angle: 180 },
    [constants.Direction.RIGHT_TO_TOP]: { is_corner: true, angle: 180 },
    [constants.Direction.RIGHT_TO_BOTTOM]: { is_corner: true, angle: 270 }
};

export class Track {
    constructor(grid, x, y, direction, is_own, special_color=undefined) {
        this.special_color = special_color;
        this.x = x;
        this.y = y;
        this.direction = direction;
        const { is_corner, angle } = DIRECTION_TO_PIECE_ORIENTATION[direction];
        this.is_own = is_own;
        this.angle = angle;
        this.grid_sprite = grid.create_grid_sprite((this.is_own ? 'own_' : '') + (is_corner ? 'turn' : 'track'),
                                                   sprite => this.on_sprite_create(sprite));
        this.grid_sprite.update(this.x, this.y, (sprite, x, y) => sprite.setPosition(x, y));
        this.faded = false;
        this.fade_interval = undefined;
        this.removed = false;
    }

    on_sprite_create(sprite) {
        sprite.setAlpha(1);
        sprite.setAngle(this.angle);
        sprite.setTint(this.tint, this.tint, this.tint, this.tint);
        sprite.setScale(TRACK_SCALE);
        sprite.setDepth(this.is_own ? OWN_TRACK_Z_INEDX : NORMAL_TRACK_Z_INDEX);
    }

    fade_out() {
        if (this.removed || this.faded) {
            return;
        }
        this.faded = true;
        let alpha = 1;
        this.fade_interval = setInterval(() => {
            alpha = Math.max(0, alpha - 0.025);
            if (alpha == 0) {
                this.remove(false);
            } else {
                this.grid_sprite.update(this.x, this.y, (sprite) => {
                    sprite.setAlpha(alpha, alpha, alpha, alpha);
                });
            }
        }, 1000 / 60);
    }

    get tint() {
        return this.is_own ? 0x00ff00 : 0xffffff;
    }

    remove(fading=true) {
        if (fading && this.grid_sprite) {
            this.fade_out();
            return;
        }
        if (this.fade_interval) {
            clearInterval(this.fade_interval);
            this.fade_interval = undefined;
        }
        if (this.grid_sprite) {
            this.grid_sprite.destroy();
            this.grid_sprite = undefined;
        }
        this.removed = true;
    }

    static from_server_new_tracks(grid, server_tracks, is_own, special_color=undefined) {
        return server_tracks.map(server_track => new Track(grid, server_track.x, server_track.y, server_track.direction, is_own, special_color));
    }

    static create_connector_track(grid, tracks, leftover_tracks, special_color=undefined) {
        if (!leftover_tracks.length) {
            return;
        }
        let first_regular_track = tracks[0];
        let last_leftover_track = leftover_tracks[leftover_tracks.length - 1];
        let first_regular_track_direction_components = direction_to_direction_components(first_regular_track.direction);
        let last_leftover_track_direction_components = direction_to_direction_components(last_leftover_track.direction);
        let direction = direction_from_direction_components(last_leftover_track_direction_components.from, first_regular_track_direction_components.to);
        return new Track(grid, first_regular_track.x, first_regular_track.y, direction, first_regular_track.is_own, special_color);
    }
}
