const GRID_ORIGIN_X = 40;
const GRID_ORIGIN_Y = 40;

const GRID_PIECE_IMAGE_WIDTH = 100;
export const TRACK_SCALE = 0.3;
export const GRID_PIECE_WIDTH = GRID_PIECE_IMAGE_WIDTH * TRACK_SCALE;

export const NORMAL_TRACK_Z_INDEX = 1;
export const OWN_TRACK_Z_INEDX = 2;
export const CART_Z_INEDX = 3;
export const LABELS_Z_INDEX = 4;

export function update_grid_sprite(sprite, grid_x, grid_y, angle, tint, alpha=1) {
    sprite.setPosition(GRID_ORIGIN_X + grid_x * GRID_PIECE_WIDTH, GRID_ORIGIN_Y + grid_y * GRID_PIECE_WIDTH);
    sprite.setAngle(angle);
    sprite.setTint(tint, tint, tint, tint);
    sprite.setAlpha(alpha, alpha, alpha, alpha);
}

export function draw_grid_sprite(scene, grid_x, grid_y, angle, sprite_name, scale, depth, tint, alpha=1) {
    let grid_sprite = scene.add.sprite(0, 0, sprite_name);
    update_grid_sprite(grid_sprite, grid_x, grid_y, angle, tint, alpha);
    grid_sprite.setScale(scale);
    grid_sprite.setDepth(depth);
    return grid_sprite;
}
