const constants = require('../common/constants.js');
const { draw_grid_sprite, TRACK_SCALE, NORMAL_TRACK_Z_INDEX, OWN_TRACK_Z_INEDX } = require('./grid.js');

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
    constructor(x, y, direction, is_own) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        const { is_corner, angle } = DIRECTION_TO_PIECE_ORIENTATION[direction];
        this.is_corner = is_corner;
        this.is_own = is_own;
        this.angle = angle;
        this.sprite = undefined;
    }

    draw() {
        if (!this.sprite) {
            this.sprite = draw_grid_sprite(
                this.x, this.y, this.angle, 
                (this.is_own ? 'own_' : '') + (this.is_corner ? 'turn' : 'track'), 
                TRACK_SCALE, 
                this.is_own ? OWN_TRACK_Z_INEDX : NORMAL_TRACK_Z_INDEX, 
                this.is_own ? 0x00ff00 : 0xffffff,
                1);
        }
    }
  
    remove() {
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = undefined;
        }
    }

    static from_server_new_tracks(server_tracks, is_own) {
        return server_tracks.map(server_track => new Track(server_track.x, server_track.y, server_track.direction, is_own));
    }
}
