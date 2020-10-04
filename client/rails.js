const { draw_grid_sprite, TRACK_SCALE, NORMAL_TRACK_Z_INDEX, OWN_TRACK_Z_INEDX } = require('./grid.js');
let map = undefined;

function draw_rail_tile(rail_tile, is_own) {
    if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'top') {
        draw_track_piece(rail_tile.x, rail_tile.y, 270, is_own);
    } else if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'left') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 0, is_own);
    } else if (rail_tile.direction_from == 'bottom' && rail_tile.direction_to == 'right') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 270, is_own);
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'bottom') {
        draw_track_piece(rail_tile.x, rail_tile.y, 90, is_own);
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'left') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 90, is_own);
    } else if (rail_tile.direction_from == 'top' && rail_tile.direction_to == 'right') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 180, is_own);
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'top') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 90, is_own);
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'bottom') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 0, is_own);
    } else if (rail_tile.direction_from == 'left' && rail_tile.direction_to == 'right') {
        draw_track_piece(rail_tile.x, rail_tile.y, 0, is_own);
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'left') {
        draw_track_piece(rail_tile.x, rail_tile.y, 180, is_own);
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'top') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 180, is_own);
    } else if (rail_tile.direction_from == 'right' && rail_tile.direction_to == 'bottom') {
        draw_corner_piece(rail_tile.x, rail_tile.y, 270, is_own);
    }
}

function draw_track_piece(grid_x, grid_y, angle, is_own) {
    return draw_grid_sprite(
        grid_x, grid_y, angle, 
        is_own ? 'own_track' : 'track', 
        TRACK_SCALE, 
        is_own ? OWN_TRACK_Z_INEDX : NORMAL_TRACK_Z_INDEX, 
        is_own ? 0x00ff00 : 0xffffff,
        1);
}

function draw_corner_piece(grid_x, grid_y, angle, is_own) {
    return draw_grid_sprite(
        grid_x, grid_y, angle, 
        is_own ? 'own_turn' : 'turn', 
        TRACK_SCALE, 
        is_own ? OWN_TRACK_Z_INEDX : NORMAL_TRACK_Z_INDEX, 
        is_own ? 0x00ff00 : 0xffffff,
        1);
}

function draw_rails(player_route_id) {
    for(const route_id in map) {
        for (const rail_tile of map[route_id].tiles) {
            draw_rail_tile(rail_tile, player_route_id == route_id);
        }
    }
}

function set_rails(outside_map) {
    map = outside_map;
}

function get_rails_by_id(route_id) {
    return map[route_id];
}

exports.draw_rails = draw_rails;
exports.set_rails = set_rails;
exports.get_rails_by_id = get_rails_by_id;