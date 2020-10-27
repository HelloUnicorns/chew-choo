const assert = require('assert');
const constants = require('../common/constants.js');
const { direction_to_direction_components, direction_from_direction_components } = require('../common/utils.js');
const { draw_grid_sprite, update_grid_sprite, TRACK_SCALE, NORMAL_TRACK_Z_INDEX, OWN_TRACK_Z_INEDX } = require('./grid.js');

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
    constructor(scene, x, y, direction, is_own, special_color=undefined) {
        this.scene = scene;
        this.special_color = special_color;
        this.x = x;
        this.y = y;
        this.direction = direction;
        const { is_corner, angle } = DIRECTION_TO_PIECE_ORIENTATION[direction];
        this.is_corner = is_corner;
        this.is_own = is_own;
        this.angle = angle;
        this.sprite = undefined;
        this.faded = false;
        this.fade_interval = undefined;
        this.removed = false;
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
                update_grid_sprite(this.sprite, this.x, this.y, this.angle, this.tint, alpha);
            }
        }, 1000 / 60);
    }

    get tint() {
        // if (this.special_color) return this.special_color;
        return this.is_own ? 0x00ff00 : 0xffffff;
    }

    draw() {
        if (!this.sprite) {
            this.sprite = draw_grid_sprite(
                this.scene,
                this.x, this.y, this.angle, 
                (this.is_own ? 'own_' : '') + (this.is_corner ? 'turn' : 'track'), 
                TRACK_SCALE, 
                this.is_own ? OWN_TRACK_Z_INEDX : NORMAL_TRACK_Z_INDEX, 
                this.tint,
                1);
        }
    }
    remove(fading=true) {
        if (fading && this.sprite) {
            this.fade_out();
            return;
        }
        if (this.fade_interval) {
            clearInterval(this.fade_interval);
            this.fade_interval = undefined;
        }
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = undefined;
        }
        this.removed = true;
    }

    static from_server_new_tracks(scene, server_tracks, is_own, special_color=undefined) {
        return server_tracks.map(server_track => new Track(scene, server_track.x, server_track.y, server_track.direction, is_own, special_color));
    }

    static create_connector_track(scene, tracks, leftover_tracks, special_color=undefined) {
        if (!leftover_tracks.length) {
            return;
        }
        let first_regular_track = tracks[0];
        let last_leftover_track = leftover_tracks[leftover_tracks.length - 1];
        let first_regular_track_direction_components = direction_to_direction_components(first_regular_track.direction);
        let last_leftover_track_direction_components = direction_to_direction_components(last_leftover_track.direction);
        let direction = direction_from_direction_components(last_leftover_track_direction_components.from, first_regular_track_direction_components.to);
        return new Track(scene, first_regular_track.x, first_regular_track.y, direction, first_regular_track.is_own, special_color);
    }
}
