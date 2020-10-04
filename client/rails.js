const { draw_grid_sprite, TRACK_SCALE, NORMAL_TRACK_Z_INDEX, OWN_TRACK_Z_INEDX } = require('./grid.js');
let map = undefined;

function draw_rail_tile(rail_tile, is_own) {
    if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'top') {
        return draw_track_piece(rail_tile.x, rail_tile.y, 270, is_own);
    } else if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'left') {
        return draw_corner_piece(rail_tile.x, rail_tile.y, 0, is_own);
    } else if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'right') {
        return draw_corner_piece(rail_tile.x, rail_tile.y, 270, is_own);
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'bottom') {
        return draw_track_piece(rail_tile.x, rail_tile.y, 90, is_own);
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'left') {
        return draw_corner_piece(rail_tile.x, rail_tile.y, 90, is_own);
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'right') {
        return draw_corner_piece(rail_tile.x, rail_tile.y, 180, is_own);
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'top') {
        return draw_corner_piece(rail_tile.x, rail_tile.y, 90, is_own);
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'bottom') {
        return draw_corner_piece(rail_tile.x, rail_tile.y, 0, is_own);
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'right') {
        return draw_track_piece(rail_tile.x, rail_tile.y, 0, is_own);
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'left') {
        return draw_track_piece(rail_tile.x, rail_tile.y, 180, is_own);
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'top') {
        return draw_corner_piece(rail_tile.x, rail_tile.y, 180, is_own);
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'bottom') {
        return draw_corner_piece(rail_tile.x, rail_tile.y, 270, is_own);
    }
    throw new Exception('Unknown rail type');
}

function draw_track_piece(grid_x, grid_y, angle, is_own) {
    return draw_grid_sprite(
        grid_x, grid_y, angle, 
        is_own ? 'own_track' : 'track', 
        TRACK_SCALE, 
        is_own ? OWN_TRACK_Z_INEDX : NORMAL_TRACK_Z_INDEX, 
        is_own ? 0x00ff00 : 0xffffff);
}

function draw_corner_piece(grid_x, grid_y, angle, is_own) {
    return draw_grid_sprite(
        grid_x, grid_y, angle, 
        is_own ? 'own_turn' : 'turn', 
        TRACK_SCALE, 
        is_own ? OWN_TRACK_Z_INEDX : NORMAL_TRACK_Z_INDEX, 
        is_own ? 0x00ff00 : 0xffffff);
}

/*  route_id: Route id of the currently drawn route,
    player_route_id: Route id of the client */
function draw_rail(route_id, player_route_id) {
    if (map[route_id].sprites && map[route_id].sprites.length > 0) {
        map[route_id].sprites.forEach((sprite) => {
            sprite.destroy();
        });
    }
    map[route_id].sprites = [];
    for (const rail_tile of map[route_id].tiles) {
        map[route_id].sprites.push(draw_rail_tile(rail_tile, player_route_id == route_id));
    }
}

function draw_rails(player_route_id) {
    for(const route_id in map) {
        draw_rail(route_id, player_route_id);
    }
}

function set_rails(outside_map) {
    map = outside_map;
}

function get_rails_by_id(route_id) {
    return map[route_id];
}

function update_rail(route_id, tiles, player_route_id) {
    map[route_id].tiles = tiles;
    draw_rail(route_id, player_route_id);
}

exports.draw_rails = draw_rails;
exports.set_rails = set_rails;
exports.get_rails_by_id = get_rails_by_id;
exports.update_rail = update_rail;