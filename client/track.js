const { draw_grid_sprite, TRACK_SCALE, NORMAL_TRACK_Z_INDEX, OWN_TRACK_Z_INEDX } = require('./grid.js');

export class Track {
    constructor(x, y, direction_from, direction_to, is_own) {
        this.x = x;
        this.y = y;
        this.direction_from = direction_from;
        this.direction_to = direction_to;
        const { is_corner, angle } = this.constructor.get_piece_orientation(direction_from, direction_to);
        this.is_corner = is_corner;
        this.is_own = is_own;
        this.angle = angle;
        this.sprite = undefined;
    }

    static get_piece_orientation(direction_from, direction_to) {
        if (direction_from == 'bottom' && direction_to == 'top') {
            return { is_corner: false, angle: 270 };
        } else if (direction_from == 'bottom' && direction_to == 'left') {
            return { is_corner: true, angle: 0 };
        } else if (direction_from == 'bottom' && direction_to == 'right') {
            return { is_corner: true, angle: 270 };
        } else if (direction_from == 'top' && direction_to == 'bottom') {
            return { is_corner: false, angle: 90 };
        } else if (direction_from == 'top' && direction_to == 'left') {
            return { is_corner: true, angle: 90 };
        } else if (direction_from == 'top' && direction_to == 'right') {
            return { is_corner: true, angle: 180 };
        } else if (direction_from == 'left' && direction_to == 'top') {
            return { is_corner: true, angle: 90 };
        } else if (direction_from == 'left' && direction_to == 'bottom') {
            return { is_corner: true, angle: 0 };
        } else if (direction_from == 'left' && direction_to == 'right') {
            return { is_corner: false, angle: 0 };
        } else if (direction_from == 'right' && direction_to == 'left') {
            return { is_corner: false, angle: 180 };
        } else if (direction_from == 'right' && direction_to == 'top') {
            return { is_corner: true, angle: 180 };
        } else if (direction_from == 'right' && direction_to == 'bottom') {
            return { is_corner: true, angle: 270 };
        }
        throw new Error(`Unknown rail type: ${rail_tile.direction_from}->${rail_tile.direction_to}`);
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

    static from_server_track(server_track, is_own) {
        return new Track(server_track.x, server_track.y, server_track.direction_from, 
            server_track.direction_to, is_own);
    }
}
