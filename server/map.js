const { performance } = require('perf_hooks');
const { calculate_speed_and_position, set_train_position } = require('../common/position.js');
const constants = require('../common/constants.js');
const e = require('express');

let route_start_positions = [

];

let directions = ['right', 'down', 'left', 'up']
const MAX_PLAYERS = 65;

let map = {};
let x_map = {};


function tile_to_player(tile) {
    return map[tile.route_id].player;
}

function mark_tile_occupied(tile, entering=false) {
    x_map[tile.x] = x_map[tile.x] || {};
    x_map[tile.x][tile.y] = x_map[tile.x][tile.y] || [];

    let matching_tiles = x_map[tile.x][tile.y].filter(t => t.route_id == tile.route_id);
    if (matching_tiles.length > 0) {
        for (let tile of matching_tiles) {
            tile.entering = entering;
        }
        return;
    }
    tile.entering = entering;
    x_map[tile.x][tile.y].push(tile);
}

function clear_tile_occupied(tile) {
    if (!x_map[tile.x] || !x_map[tile.x][tile.y]) {
        return;
    }

    x_map[tile.x][tile.y] = x_map[tile.x][tile.y].filter(t => t.route_id != tile.route_id);
    if(x_map[tile.x][tile.y].length == 0) {
        delete x_map[tile.x][tile.y];
    }

    if (Object.keys(x_map[tile.x]).length == 0) {
        delete x_map[tile.x];
    }
}


function build_rectangular_route(grid_x, grid_y, width, height, route_id) {
    let route = [];
    for (let i = 1; i < width - 1; i++) {
        route.push({x: grid_x + i, y: grid_y, direction_from: 'left', direction_to: 'right', route_id});
    }

    route.push({x: grid_x + width - 1, y: grid_y, direction_from: 'left', direction_to: 'bottom', route_id});
    
    for (let i = 1; i < height - 1; i++) {
        route.push({x: grid_x + width - 1, y: grid_y + i, direction_from: 'top', direction_to: 'bottom', route_id});
    }

    route.push({x: grid_x + width - 1, y: grid_y + height - 1, direction_from: 'top', direction_to: 'left', route_id});
    
    for (let i = width - 2; i > 0; i--) {
        route.push({x: grid_x + i, y: grid_y + height - 1, direction_from: 'right', direction_to: 'left', route_id});
    }
    
    route.push({x: grid_x, y: grid_y + height - 1, direction_from: 'right', direction_to: 'top', route_id});
    
    for (let i = height - 2; i > 0; i--) {
        route.push({x: grid_x, y: grid_y + i, direction_from: 'bottom', direction_to: 'top', route_id});
    }

    route.push({x: grid_x, y: grid_y, direction_from: 'bottom', direction_to: 'right', route_id});
 
    return route;
}

function find_crossings(tiles_array) {
    crossings = [];
    for (let tile_0_idx = 0; tile_0_idx < tiles_array[0].length; tile_0_idx++) {
        for (let tile_1_idx = 0; tile_1_idx < tiles_array[1].length; tile_1_idx++) {
            if (tiles_array[0][tile_0_idx].x == tiles_array[1][tile_1_idx].x &&
                tiles_array[0][tile_0_idx].y == tiles_array[1][tile_1_idx].y) {
                crossings.push({
                    tile_indices: [tile_0_idx, tile_1_idx],
                    x: tiles_array[0][tile_0_idx].x,
                    y: tiles_array[0][tile_0_idx].y})
            }
        }    
    }
    return crossings;
}

function find_crossing_by_tile(crossings, tile) {
    for (const crossing of crossings) {
        if (crossing.x == tile.x && crossing.y == tile.y) {
            return crossing;
        }
    }
}

function get_next_tile_index(tiles, tile_index) {
    return (tile_index + 1) % tiles.length;
}

function walk_tiles_to_next_crossing(tiles, start_tile_index, crossings) {
    let cur_index = start_tile_index;
    let crossing = undefined;
    let path = [];

    do {
        path.push(tiles[cur_index]);
        cur_index = get_next_tile_index(tiles, cur_index);
        crossing = find_crossing_by_tile(crossings, tiles[cur_index]);
    } while (!crossing);
    return { path, crossing, crossing_tile: tiles[cur_index] };
}

function find_top_left_tile_index(tiles) {
    let top_left_tile_index = 0;
    for (let tile_index = 0; tile_index < tiles.length; tile_index++) {
        if ((tiles[tile_index].x < tiles[top_left_tile_index].x) || 
            (tiles[tile_index].x == tiles[top_left_tile_index].x && tiles[tile_index].y <= tiles[top_left_tile_index].y)) {
                top_left_tile_index = tile_index;
        }
    }
    return top_left_tile_index;
}

function find_external_crossing(crossings, tiles_arrays) {
    let external_tiles_indices = tiles_arrays.map(find_top_left_tile_index);
    let external_tiles = tiles_arrays.map((tiles, idx) => tiles[external_tiles_indices[idx]]);
    let top_left_tile_index = find_top_left_tile_index(external_tiles);
    return { 
        first_external_crossing: 
            walk_tiles_to_next_crossing(tiles_arrays[top_left_tile_index],
                                        external_tiles_indices[top_left_tile_index],
                                        crossings).crossing, 
        tiles_array_index: top_left_tile_index 
    }
}


function union_routes(killer_route_id, killee_route_id) {
    let killer_tiles = map[killer_route_id].tiles;
    let killee_tiles = map[killee_route_id].tiles;
    let tiles_arrays = [killer_tiles, killee_tiles];
    let crossings = find_crossings(tiles_arrays);
    const { first_external_crossing, tiles_array_index } = find_external_crossing(crossings, tiles_arrays);
    let current_crossing = first_external_crossing;
    let current_tiles_array_index = tiles_array_index;
    let external_crossings = [];
    let killer_player = map[killer_route_id].player;
    let killer_tile = map[killer_route_id].tiles[killer_player.position_in_route];
    let closest_external_crossing = undefined;
    let new_route_parts = []; 
    let new_route = []; 
    let leftover_tiles = [];

    do {
        current_tiles_array_index = 1 - current_tiles_array_index;
        external_crossings.push(current_crossing);
        const { crossing, path } = walk_tiles_to_next_crossing(
            tiles_arrays[current_tiles_array_index],
            current_crossing.tile_indices[current_tiles_array_index],
            crossings);
        path[0].direction_from = tiles_arrays[1 - current_tiles_array_index][current_crossing.tile_indices[1 - current_tiles_array_index]].direction_from;
        path[0].direction_to = tiles_arrays[current_tiles_array_index][current_crossing.tile_indices[current_tiles_array_index]].direction_to;
        current_crossing = crossing;
        new_route_parts.push(path);
        if (crossing.x == killer_tile.x && crossing.y == killer_tile.y) {
            closest_external_crossing = crossing;
        }
    } while (current_crossing != first_external_crossing);
    

    if (!closest_external_crossing) {
        const { crossing, path, crossing_tile } = walk_tiles_to_next_crossing(killer_tiles, killer_player.position_in_route, external_crossings);
        closest_external_crossing = crossing;
        /* add the last tile - it would be twice, both in the leftover and in the position in route */
        path.push(crossing_tile);
        leftover_tiles = path;
    }

    /* we always want the first tile in the route to be the route the player is at */
    let closest_crossing_index = external_crossings.indexOf(closest_external_crossing);
    for (let i = 0; i < new_route_parts.length; i++) {
        new_route = new_route.concat(new_route_parts[(i + closest_crossing_index) % new_route_parts.length]);
    }
    
    new_route.concat(leftover_tiles).forEach(tile => {
        tile.entering = false;
        tile.route_id = killer_route_id;
    });

    map[killer_route_id].tiles = new_route;
    map[killer_route_id].player.position_in_route = 0;
    map[killer_route_id].leftover_tiles = leftover_tiles;
    if (leftover_tiles.length > 0) {
        map[killer_route_id].player.is_in_leftover = true;
    }
    map[killee_route_id].tiles = [];

    
    unload_player_from_x_map(killer_route_id);
    unload_player_from_x_map(killee_route_id);
    update_occupied_tiles(map[killer_route_id]);
}

function compute_start_positions() {
    /*  
            25      14      15      16
                13      6       7
            24      5       2       17
                12      1       8
            23      4       3       18
                11      10      9
            22      21      20      19                
    */
    route_start_positions.push({x: constants.START_X, y: constants.START_Y});
    let direction = 'right';
    let count = 1;
    let current_count = 1;
    for (let i = 1; i < MAX_PLAYERS; i++) {
        last = route_start_positions[i - 1];
        switch (direction) {
            case 'right':
                if (current_count == count) {
                    y = last.y - constants.TRACK_HEIGHT * 2 / 3;
                    x = last.x + constants.TRACK_WIDTH * 2 / 3;
                } else {
                    y = last.y;
                    x = last.x + (constants.TRACK_WIDTH * 2 / 3) * 2;
                }
                break;
            case 'down':
                x = last.x;
                y = last.y + (constants.TRACK_HEIGHT * 2 / 3)  * 2;
                break;
            case 'left':
                x = last.x - (constants.TRACK_WIDTH * 2 / 3)  * 2;
                y = last.y;
                break;
            case 'up':
                x = last.x;
                y = last.y - (constants.TRACK_HEIGHT * 2 / 3)  * 2;
                break;
        }
        route_start_positions.push({
            x,
            y
        });
        current_count -= 1;
        if (current_count == 0) {
            direction = directions[(directions.indexOf(direction) + 1) % (directions.length)];
            if (direction == 'right') {
                count += 1;
            }
            current_count = count;
        }
    }
}

function init_map() {
    if (route_start_positions.length == 0) {
        compute_start_positions();
    }

    x_map = {};

    for (let i = 0; i < MAX_PLAYERS; ++i) {
        start_position = route_start_positions[i];
        map[i] = {
            tiles: build_rectangular_route(start_position.x, start_position.y, constants.TRACK_WIDTH, constants.TRACK_HEIGHT, i),
            leftover_tiles: [],
            player: {
                position_in_route: 0,
                last_position_update: performance.now(),
                position_fraction: 0,
                is_in_leftover: false,
                length: 3,
                speed: constants.MIN_SPEED, /* in tiles per second */
                acceleration: 0, /* in tiles per second squared */
                is_speed_up: false,
                is_speed_down: false,
                killed: false,
                is_stopped: false,
                invincibility_state: constants.PLAYER_NOT_INVINCIBLE,
                killer: -1,
                kill_notified: false,
                assignable: true,
                is_bot: true,
            }
        };
    }
}

function new_player() {
    for (const route_id in map) {
        if (!map[route_id].player.is_bot || !map[route_id].player.assignable) {
            continue;
        }
        console.log('assigning player', route_id);
        map[route_id].player.is_bot = false;
        return route_id;
    }
}

function unload_player_from_x_map(route_id) {
    /* Delete player from x_map */
    for (const x in x_map) {
        for (const y in x_map[x]) {
            x_map[x][y] = x_map[x][y].filter(tile => tile.route_id != route_id);
        }
    }
}

function replace_player_with_bot(route_id) {
    if (map[route_id]) {
        map[route_id].player.is_bot = true;
    }
}

function update_occupied_tiles(route) {
    let player_position = route.player.position_in_route;

    /* Locomotive */
    mark_tile_occupied(route.tiles[player_position]);

    /* Last cart */
    mark_tile_occupied(route.tiles[(player_position - route.player.length + 1 + route.tiles.length) % route.tiles.length]);

    /* Tile ahead of locomotive */
    if (route.player.position_fraction) {
        mark_tile_occupied(route.tiles[(player_position + 1) % route.tiles.length], entering=true);
    }

    /* Tile behind last cart */
    clear_tile_occupied(route.tiles[(player_position - route.player.length + route.tiles.length) % route.tiles.length]);

}

function handle_collision(tiles) {
    if (tiles.length < 2) {
        return;
    }
    if (tiles.length > 2) {
        throw new Error('More than 2 trains collided');
    }

    let players = tiles.map(tile_to_player);
        
    if (players.some(player => (player.killed || player.invincibility_state != constants.PLAYER_NOT_INVINCIBLE))) {
        return;
    }
    
    let killer_tile = undefined;
    let entering_tiles = tiles.filter(tile => tile.entering);
    if (entering_tiles.length == 1) {
        killer_tile = entering_tiles[0];
    } else {
        console.log('player', players[0].position_fraction, players[1].position_fraction);
        let killer_index = (players[0].position_fraction < players[1].position_fraction) ? 0 : 1;
        killer_tile = tiles[killer_index];
    }

    let killee_tile = tiles.find(tile => tile != killer_tile);
    let killee_player = tile_to_player(killee_tile);
    let killer_player = tile_to_player(killer_tile);
    
    killee_player.killed = true;
    killee_player.killer = killer_tile.route_id;

    console.log(`Player in route ${killee_tile.route_id} got killed`);    
    union_routes(killer_tile.route_id, killee_tile.route_id);

    killee_player.assignable = false;
    killer_player.assignable = false;
    
}

function detect_collisions() {
    for (const x in x_map) {
        for (const y in x_map[x]) {
            let tiles = x_map[x][y];
            if (tiles.length > 1) {
                handle_collision(tiles);
            } 
        }
    }
}

function update_map() {
    let new_time = performance.now();
    let routes_removed_leftover = [];
    for (const route_id in map) {
        const route = map[route_id];
        if (route.player.killed) {
            continue;
        }

        if (route.player.is_in_leftover) {
            calculate_speed_and_position(route.player, Infinity, new_time);
            if (route.player.position_in_route >= route.leftover_tiles.length) {
                /* left the leftover */
                set_train_position(route.player, route.player.position_in_route - route.leftover_tiles.length, route.tiles.length);
                route.leftover_tiles = [];
                route.player.is_in_leftover = false;
                routes_removed_leftover.push({ route_id, tiles: route.tiles });
            }
        } else {
            calculate_speed_and_position(route.player, route.tiles.length, new_time);
        }
        update_occupied_tiles(route);
    }
    return routes_removed_leftover;
}

function is_speed_up(speed_message_value) {
    return speed_message_value & constants.SPEED_UP_FLAG;
}

function is_speed_down(speed_message_value) {
    return speed_message_value & constants.SPEED_DOWN_FLAG;
}

function update_speed_change(route_id, speed_message_value) {
    map[route_id].player.is_speed_up = is_speed_up(speed_message_value);
    map[route_id].player.is_speed_down = is_speed_down(speed_message_value);
}

init_map();

exports.map = map;
exports.new_player = new_player;
exports.update_map = update_map;
exports.update_speed_change = update_speed_change;
exports.replace_player_with_bot = replace_player_with_bot;
exports.detect_collisions = detect_collisions;
exports.init_map = init_map;