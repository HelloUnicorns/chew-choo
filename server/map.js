const { performance } = require('perf_hooks');
const { calculate_speed_and_position } = require('../common/position.js');
const constants = require('../common/constants.js');

let route_start_positions = [

];

let directions = ['right', 'down', 'left', 'up']
const MAX_PLAYERS = 65;

let map = {};
let x_map = {};

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

Array.prototype.rotate = (function() {
    // save references to array functions to make lookup faster
    var push = Array.prototype.push,
        splice = Array.prototype.splice;

    return function(count) {
        var len = this.length >>> 0, // convert to uint
            count = -(count >> 0); // convert to int

        // convert count to value in range [0, len)
        count = ((count % len) + len) % len;

        // use splice.call() instead of this.splice() to make function generic
        push.apply(this, splice.call(this, 0, count));
        return this;
    };
})();

const ROTATION = constants.TRACK_HEIGHT / 3;
function merge_routes(killer_route_id, killee_route_id) {
    function indexOf(arr, coor) {
        for (let [index, item] of arr.entries()) {
            if (item[0] == coor[0] && item[1] == coor[1]) {
                return index;
            }
        }

        return -1;
    }

    function indexOf2(arr, coor) {
        for (let [index, item] of arr.entries()) {
            if (item.x == coor[0] && item.y == coor[1]) {
                return index;
            }
        }
        return -1;
    }

    let killer_tiles = map[killer_route_id].tiles;
    let killee_tiles = map[killee_route_id].tiles;

    map[killer_route_id].player.assignable = false;
    map[killee_route_id].player.assignable = false;
    console.log(`route ${killer_route_id} unassignable anymore`)
    console.log(`route ${killee_route_id} unassignable anymore`)

    killer_tiles.rotate(ROTATION);
    killee_tiles.rotate(ROTATION);

    
    let killer_coors = killer_tiles.map(tile => [tile.x, tile.y]);
    let killee_coors = killee_tiles.map(tile => [tile.x, tile.y]);
    let first_killer_coordinates = killer_coors[0];

    let crossings = [];
    for (let coor_killer of killer_coors) {
        for (let coor_killee of killee_coors) {
            if (coor_killer[0] == coor_killee[0] && coor_killer[1] == coor_killee[1]) {
                crossings.push(coor_killer);
            }
        }
    }

    if (crossings.length != 2) {
        throw new Error(`Routes have ${crossings.length} crossings`);
    }

    let killer_crossing_indexes = crossings.map(crossing => indexOf(killer_coors, crossing));

    let killer_start_position =  Math.min(...killer_crossing_indexes);
    let killer_end_position =  Math.max(...killer_crossing_indexes);

    let killee_start_position =  indexOf(killee_coors, killer_coors[killer_start_position]);
    let killee_end_position =  indexOf(killee_coors, killer_coors[killer_end_position]);

    /* Set directions */
    killer_tiles[killer_start_position].direction_to = killee_tiles[killee_start_position].direction_to;
    killer_tiles[killer_end_position].direction_from = killee_tiles[killee_end_position].direction_from;

    /* Get tiles from killee */
    let crossing_length = Math.min(
        Math.abs(killer_start_position - killer_end_position),
        Math.abs(killee_start_position - killee_end_position),
    );
    killee_tiles.rotate(-killee_start_position - 1);
    for (let i = 0; i < crossing_length + 1; ++i) {
        killee_tiles.pop();
    }

    /* Prepare killer tiles */
    killer_tiles.rotate(-killer_end_position);
    for (let i = 0; i < crossing_length - 1; ++i) {
        killer_tiles.pop();
    }
    
    killer_tiles = [].concat(killer_tiles, killee_tiles);

    killer_tiles.forEach(tile => {
        tile.entering = false;
        tile.route_id = killer_route_id;
    });

    killer_tiles.rotate(-indexOf2(killer_tiles, first_killer_coordinates));
    killer_tiles.rotate(-ROTATION);
    map[killer_route_id].tiles = killer_tiles; 
    /* Delete tiles of killee */
    map[killee_route_id].tiles = [];
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
    for (let i =1; i < MAX_PLAYERS; i++) {
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
    compute_start_positions();
    for (let i = 0; i < MAX_PLAYERS; ++i) {
        start_position = route_start_positions[i];
        map[i] = {
            tiles: build_rectangular_route(start_position.x, start_position.y, constants.TRACK_WIDTH, constants.TRACK_HEIGHT, i),
            player: {
                position_in_route: 0,
                last_position_update: performance.now(),
                position_fraction: 0,
                length: 3,
                speed: constants.MIN_SPEED, /* in tiles per second */
                acceleration: 0, /* in tiles per second squared */
                is_speed_up: false,
                is_speed_down: false,
                killed: false,
                is_stopped: false,
                is_invincible: false,
                killer: -1,
                kill_notified: false,
                assignable: true,
                is_bot: true,
            }
        };
    }
}

function new_player() {
    for (let i = 0; i < MAX_PLAYERS; ++i) {
        if (!map[i].player.is_bot || !map[i].player.assignable) {
            continue;
        }
        console.log('assigning player', i);
        map[i].player.is_bot = false;
        return i;
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
    map[route_id].player.is_bot = true;
}

function replace_player_with_bot(route_id) {
    map[route_id].player.is_bot = true;
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
    if (tiles.length > 2) {
        throw new Error('More than 2 trains collided');
    } else if ( tiles.length < 2) {
        return;
    }

    let player_0 = map[tiles[0].route_id].player;
    let player_1 = map[tiles[1].route_id].player;
    if (player_0.killed || player_1.killed || player_0.is_invincible || player_1.is_invincible) {
        return;
    }

    let killed = tiles.filter(tile => !tile.entering);
    if (killed.length == 0) {
        if (player_0.position_fraction >= player_1.position_fraction) {
            player_0.killed = true;
            player_0.killer = tiles[1].route_id;
            console.log('killed', tiles[0].route_id)
            unload_player_from_x_map(tiles[0].route_id);
            merge_routes(tiles[1].route_id, tiles[0].route_id);
        } else {
            player_1.killed = true;
            player_1.killer = tiles[0].route_id;
            console.log('killed', tiles[1].route_id)
            unload_player_from_x_map(tiles[1].route_id);
            merge_routes(tiles[0].route_id, tiles[1].route_id);
        }
        return;
    }


    for (let tile of killed) {
        map[tile.route_id].player.killed = true;
        unload_player_from_x_map(tile.route_id);
        console.log(`Player in route ${tile.route_id} got killed`);
    }

    if (killed.length == 1) {
        let killed_player = killed[0];
        let killed_id = killed_player.route_id;
        let killer_id = tiles.filter(tile => tile.route_id != killed_id)[0].route_id;

        map[killed_player.route_id].player.killer = killer_id;
        killed_player.killed = true;
        console.log('killed', killed_player.route_id)
        merge_routes(killer_id, killed_id);
    }
}5

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
    for (const route_id in map) {
        const route = map[route_id];
        if (route.player.killed) {
            continue;
        }
        calculate_speed_and_position(route.player, route, new_time);
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
exports.replace_player_with_bot = replace_player_with_bot;
exports.detect_collisions = detect_collisions;
