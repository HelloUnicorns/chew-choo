const global_data = require('./global_data.js')
const GRID_ORIGIN_X = 40;
const GRID_ORIGIN_Y = 40;

const GRID_PIECE_IMAGE_WIDTH = 100;
const TRACK_SCALE = 0.3;
const GRID_PIECE_WIDTH = GRID_PIECE_IMAGE_WIDTH * TRACK_SCALE;

const NORMAL_TRACK_Z_INDEX = 1;
const OWN_TRACK_Z_INEDX = 2;
const CART_Z_INEDX = 3;
const LABELS_Z_INDEX = 4;

function update_grid_sprite(sprite, grid_x, grid_y, angle, tint, alpha=1) {
    sprite.setPosition(GRID_ORIGIN_X + grid_x * GRID_PIECE_WIDTH, GRID_ORIGIN_Y + grid_y * GRID_PIECE_WIDTH);
    sprite.setAngle(angle);
    sprite.setTint(tint, tint, tint, tint);
    sprite.setAlpha(alpha, alpha, alpha, alpha);
}

function draw_grid_sprite(grid_x, grid_y, angle, sprite_name, scale, depth, tint, alpha=1) {
    let grid_sprite = global_data.game_scene.add.sprite(0, 0, sprite_name);
    update_grid_sprite(grid_sprite, grid_x, grid_y, angle, tint, alpha);
    grid_sprite.setScale(scale);
    grid_sprite.setDepth(depth);
    return grid_sprite;
}

exports.draw_grid_sprite = draw_grid_sprite;
exports.update_grid_sprite = update_grid_sprite;
exports.TRACK_SCALE = TRACK_SCALE;
exports.NORMAL_TRACK_Z_INDEX = NORMAL_TRACK_Z_INDEX;
exports.OWN_TRACK_Z_INEDX = OWN_TRACK_Z_INEDX;
exports.CART_Z_INEDX = CART_Z_INEDX;
exports.LABELS_Z_INDEX = LABELS_Z_INDEX;
exports.GRID_PIECE_WIDTH = GRID_PIECE_WIDTH;