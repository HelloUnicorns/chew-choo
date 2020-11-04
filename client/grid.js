const assert = require('assert');

const GRID_ORIGIN_X = 40;
const GRID_ORIGIN_Y = 40;

const GRID_PIECE_IMAGE_WIDTH = 100;
export const TRACK_SCALE = 0.3;
export const GRID_PIECE_WIDTH = GRID_PIECE_IMAGE_WIDTH * TRACK_SCALE;

export const NORMAL_TRACK_Z_INDEX = 1;
export const OWN_TRACK_Z_INEDX = 2;
export const CART_Z_INEDX = 3;
export const LABELS_Z_INDEX = 4;

class GridItem {
    constructor(grid, create_callback) {
        this.grid = grid;
        this.create_callback = create_callback;
        this.resource = undefined;
    }

    _allocate_resource() {
        throw new Error("Should be implemented in subclasses");
    }

    _free_resource() {
        throw new Error("Should be implemented in subclasses");
    }

    update(grid_x, grid_y, update_callback) {
        if (this.grid.is_in_view(grid_x, grid_y)) {
            if (!this.resource) {
                this._allocate_resource();
                this.create_callback(this.resource);
            }
            if (update_callback) {
                let x = GRID_ORIGIN_X + grid_x * GRID_PIECE_WIDTH;
                let y = GRID_ORIGIN_Y + grid_y * GRID_PIECE_WIDTH;
                update_callback(this.resource, x, y);
            }
        } else {
            this._free_resource();
        }
    }

    destroy() {
        this._free_resource();
    }
}

class GridSprite extends GridItem{
    constructor(grid, sprite_name, create_callback) {
        super(grid, create_callback);
        this.sprite_name = sprite_name;
    }
    
    _allocate_resource() {
        assert(!this.resource, "cannot allocate an already allocated resource");
        this.resource = this.grid.allocate_sprite(this.sprite_name);
    }

    _free_resource() {
        this.grid.free_sprite(this.sprite_name, this.resource);
        this.resource = undefined;
    }
}

class GridText extends GridItem{
    constructor(grid, font, create_callback) {
        super(grid, create_callback);
        this.font = font;
    }
    
    _allocate_resource() {
        assert(!this.resource, "cannot allocate an already allocated resource");
        this.resource = this.grid.allocate_text(this.font);
    }

    _free_resource() {
        this.grid.free_text(this.font, this.resource);
        this.resource = undefined;
    }
}

export class Grid {
    constructor(scene) {
        this.scene = scene;
        this.items = [];
        this.sprite_pools = {};
        this.text_pools = {};
    }

    is_in_view(grid_x, grid_y) {
        return true;
    }

    create_grid_sprite(sprite_name, create_callback) {
        assert(typeof sprite_name === 'string');
        if (!(sprite_name in this.sprite_pools)) {
            this.sprite_pools[sprite_name] = [];
        }

        return new GridSprite(this, sprite_name, create_callback);
    }

    allocate_sprite(sprite_name) {
        if (this.sprite_pools[sprite_name].length > 0) {
            let sprite = this.sprite_pools[sprite_name].pop();
            sprite.visible = true;
            return sprite;
        }
        return this.scene.add.sprite(0, 0, sprite_name);
    }

    free_sprite(sprite_name, sprite) {
        sprite.visible = false;
        this.sprite_pools[sprite_name].push(sprite);
    }
    
    create_grid_text(font, create_callback) {
        assert(typeof font === 'string');
        if (!(font in this.text_pools)) {
            this.text_pools[font] = [];
        }

        return new GridText(this, font, create_callback);
    }

    allocate_text(font) {
        if (this.text_pools[font].length > 0) {
            let sprite = this.text_pools[font].pop();
            sprite.visible = true;
            return sprite;
        }
        return this.scene.add.text(0, 0, '', { font, fill: '#ffffff' });
    }

    free_text(font, resource) {
        resource.visible = false;
        this.text_pools[font].push(resource);
    }
    
}
