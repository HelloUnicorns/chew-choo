const { calculate_speed_and_position } = require('../common/position.js');
const constants = require('../common/constants.js');
const TRACK_WIDTH = 30;
const TRACK_HEIGHT = 21;

const START_X = 0;
const START_Y = 0;



let route_start_positions = [

];

let directions = ['right', 'down', 'left', 'up']
const MAX_PLAYERS = 65;

let map = {};
let x_map = {};
active_players = {};

function mark_tile_occupied(tile, entering=false) {
    x_map[tile.x] = x_map[tile.x] || {};
    x_map[tile.x][tile.y] = x_map[tile.x][tile.y] || [];

    let matching_tiles = x_map[tile.x][tile.y].filter(t => t.route_id == tile.route_id);
    if (matching_tiles.length > 0) {
        for (let tile in matching_tiles) {
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
        route.push({x: grid_x + i, y: grid_y, direction_from: 'left', direction_to: 'right', index: route.length, route_id});
    }

    route.push({x: grid_x + width - 1, y: grid_y, direction_from: 'left', direction_to: 'bottom', index: route.length, route_id});
    
    for (let i = 1; i < height - 1; i++) {
        route.push({x: grid_x + width - 1, y: grid_y + i, direction_from: 'top', direction_to: 'bottom', index: route.length, route_id});
    }

    route.push({x: grid_x + width - 1, y: grid_y + height - 1, direction_from: 'top', direction_to: 'left', index: route.length, route_id});
    
    for (let i = width - 2; i > 0; i--) {
        route.push({x: grid_x + i, y: grid_y + height - 1, direction_from: 'right', direction_to: 'left', index: route.length, route_id});
    }
    
    route.push({x: grid_x, y: grid_y + height - 1, direction_from: 'right', direction_to: 'top', index: route.length, route_id});
    
    for (let i = height - 2; i > 0; i--) {
        route.push({x: grid_x, y: grid_y + i, direction_from: 'bottom', direction_to: 'top', index: route.length, route_id});
    }

    route.push({x: grid_x, y: grid_y, direction_from: 'bottom', direction_to: 'right', index: route.length, route_id});
 
    return route;
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
    route_start_positions.push({x: START_X, y: START_Y});
    let direction = 'right';
    let count = 1;
    let current_count = 1;
    for (let i =1; i < MAX_PLAYERS; i++) {
        last = route_start_positions[i - 1];
        switch (direction) {
            case 'right':
                if (current_count == count) {
                    y = last.y - TRACK_HEIGHT * 2 / 3;
                    x = last.x + TRACK_WIDTH * 2 / 3;
                } else {
                    y = last.y;
                    x = last.x + (TRACK_WIDTH * 2 / 3) * 2;
                }
                break;
            case 'down':
                x = last.x;
                y = last.y + (TRACK_HEIGHT * 2 / 3)  * 2;
                break;
            case 'left':
                x = last.x - (TRACK_WIDTH * 2 / 3)  * 2;
                y = last.y;
                break;
            case 'up':
                x = last.x;
                y = last.y - (TRACK_HEIGHT * 2 / 3)  * 2;
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
    compute_start_positions();
    for (let i = 0; i < MAX_PLAYERS; ++i) {
        start_position = route_start_positions[i];
        map[i] = {
            tiles: build_rectangular_route(start_position.x, start_position.y, TRACK_WIDTH, TRACK_HEIGHT, i),
            player: {
                position_in_route: 0,
                last_position_update: new Date().getTime(),
                position_fraction: 0,
                length: 3,
                speed: constants.MIN_SPEED, /* in tiles per second */
                is_speed_up: false,
                is_speed_down: false,
                killed: false
            }
        };
    }
}

let entered = false;
function new_player(player_id) {
    if (entered) {
        return undefined;
    }
    entered = true;

    for (let i = 0; i < MAX_PLAYERS; ++i) {
        if (active_players[i]) {
            continue;
        }
        active_players[i] = player_id;
        map[i].player.killed = false;
        map[i].player.kill_notified = false;
        map[i].player.speed = constants.MIN_SPEED;
        entered = false;
        return i;
    }

    entered = false;
    return undefined;
}

function unload_player_from_x_map(route_id) {
    /* Delete player from x_map */
    for (const x in x_map) {
        for (const y in x_map[x]) {
            x_map[x][y] = x_map[x][y].filter(tile => tile.route_id != route_id);
        }
    }
}

function delete_player(player_id) {
    for (const [route_id, current_player_id] of Object.entries(active_players)) {
        if (player_id == current_player_id) {
            delete active_players[route_id];
            console.log(`Route ${route_id} is free`);
            break;
        }
    }
}

function update_occupied_tiles(route) {
    let occupied_tiles = [];
    let free_tiles = [];
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
    if (tiles > 2) {
        throw new Error('More than 2 trains collided');
    } else if ( tiles.length < 2) {
        return;
    }

    let player_0 = map[tiles[0].route_id].player;
    let player_1 = map[tiles[1].route_id].player;
    if (player_0.killed || player_1.killed) {
        return;
    }

    let killed = tiles.filter(tile => !tile.entering);
    if (killed.length == 0) {
        if (player_0.position_fraction >= player_1.position_fraction) {
            player_0.killed = true;
            unload_player_from_x_map(tiles[0].route_id);
        } else {
            player_1.killed = true;
            unload_player_from_x_map(tiles[1].route_id);
        }
        return;
    }

    for (let tile of killed) {
        map[tile.route_id].player.killed = true;
        unload_player_from_x_map(tile.route_id);
        console.log(`Player in route ${tile.route_id} got killed`);
    }
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
    let new_time = new Date().getTime();
    for (const route_id in map) {
        const route = map[route_id];
        if (route.player.killed) {
            continue;
        }
        calculate_speed_and_position(route.player, route.player, route, new_time);
        update_occupied_tiles(route);
    }
    
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
exports.delete_player = delete_player;
exports.detect_collisions = detect_collisions;