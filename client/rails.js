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
    throw new Error(`Unknown rail type: ${rail_tile.direction_from}->${rail_tile.direction_to}`);
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

/*  route_id: Route id of the currently drawn route,
    player_route_id: Route id of the client */
function draw_rail(route_id, player_route_id) {
    for (const rail_tile of map[route_id].tiles) {
        rail_tile.sprite = draw_rail_tile(rail_tile, player_route_id == route_id);
    }
}

function remove_rail(route_id, delete_route=false) {
    if (map[route_id]) {
        map[route_id].tiles.forEach((tile) => {
            tile.sprite.destroy();
        });
    }

    if (delete_route) {
        delete map[route_id];
    }   
}

function draw_rails(player_route_id) {
    for(const route_id in map) {
        draw_rail(route_id, player_route_id);
    }
}

function set_rails(outside_map) {
    map = {};
    for (const [route_id, route] of Object.entries(outside_map)) {
        let tiles = route.tiles.map((server_tile) => {
            return {
                direction_from: server_tile.direction_from,
                direction_to: server_tile.direction_to,
                entering: server_tile.entering,
                index: server_tile.index,
                route_id: server_tile.route_id,
                x: server_tile.x,
                y: server_tile.y,
                sprite: undefined,
            };
        });
        map[route_id] = {
            player: route.player,
            tiles: tiles,
        }
    }
}

function get_rails(route_id) {
    return map;
}

function get_rails_by_id(route_id) {
    return map[route_id];
}

function update_rail(route_id, tiles, player_route_id) {
    remove_rail(route_id, tiles.length == 0);

    if (tiles.length > 0) {
        if (!map[route_id]) {
            map[route_id] = {};
        }
        map[route_id].tiles = tiles;
        draw_rail(route_id, player_route_id);
    }
}

exports.draw_rails = draw_rails;
exports.set_rails = set_rails;
exports.get_rails = get_rails;
exports.get_rails_by_id = get_rails_by_id;
exports.update_rail = update_rail;