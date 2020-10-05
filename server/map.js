const { performance } = require('perf_hooks');
const { calculate_speed_and_position } = require('../common/position.js');
const constants = require('../common/constants.js');
const { exception } = require('console');

let route_start_positions = [

];

let directions = ['right', 'down', 'left', 'up']
const MAX_PLAYERS = 65;

/* Perform shallow copy, all types should be primitive */
const NEW_PLAYER = {
    position_in_route: 0,
    last_position_update: 0,
    position_fraction: 0,
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
    killing_list: undefined,
};

let map = {};
let x_map = {};

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

function seperate_routes(route_id) {
    /* List of route ids to reconstruct */
    let ids = map[route_id].player.killing_list.concat([route_id]);

    /* Get current position of alive bots */
    let position = 0;
    for (let [_id, route] of Object.entries(map)) {
        if (route.player && route.player.is_bot && !route.player.killed) {
            position = route.player.position_in_route;
            break;
        }
    }

    for (let _id of ids) {
        unload_player_from_x_map(_id);
        let route_start_position = route_start_positions[_id];
        map[_id] = {
            tiles: build_rectangular_route(route_start_position.x, route_start_position.y, constants.TRACK_WIDTH, constants.TRACK_HEIGHT, _id),
            player: {...NEW_PLAYER}
        };
        map[_id].player.position_in_route = position;
        map[_id].player.last_position_update = performance.now();
        map[_id].player.killing_list = [];
    }

    return ids;
}

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
        console.log(`BUG: Routes ${killer_route_id} and ${killee_route_id} have ${crossings.length} crossings`);
        return [];
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
    map[killer_route_id].player.killing_list.push(killee_route_id);
    /* Delete tiles of killee */
    map[killee_route_id].tiles = [];

    return [killer_route_id, killee_route_id];
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
            player: {...NEW_PLAYER}
        };
        map[i].player.last_position_update = performance.now();
        map[i].player.killing_list = [];
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
    if (tiles.length > 2) {
        throw new Error('More than 2 trains collided');
    } else if ( tiles.length < 2) {
        return [[], []];
    }

    let player_0 = map[tiles[0].route_id].player;
    let player_1 = map[tiles[1].route_id].player;
    if (player_0.killed
        || player_1.killed 
        || player_0.invincibility_state != constants.PLAYER_NOT_INVINCIBLE
        || player_1.invincibility_state != constants.PLAYER_NOT_INVINCIBLE) {
        return [[], []];
    }

    let killer_id = -1;
    let killed_ids = [];

    let killed_tiles = tiles.filter(tile => !tile.entering);
    switch (killed_tiles.length) {
        case 0:
            if (player_0.position_fraction >= player_1.position_fraction) {
                /* Player 1 killed player 0 */
                killer_id = tiles[1].route_id;
                killed_ids.push(tiles[0].route_id);
    
            } else {
                 /* Player 0 killed player 1 */
                killer_id = tiles[0].route_id;
                killed_ids.push(tiles[1].route_id);
            }
            break;
        case 1:
            killed_ids.push(killed_tiles[0].route_id);
            killer_id = tiles.map(tile => tile.route_id).filter(route_id => route_id != killed_ids[0]);
            break;
        case 2:
            killed_ids = killed_tiles.map(tile => tile.route_id);
            killer_id = undefined;
            break;
    }

    for (let killed_id of killed_ids) {
        map[killed_id].player.killed = true;
        unload_player_from_x_map(killed_id);
        console.log(`Player in route ${killed_id} got killed`);
    }

    if (killer_id != undefined) {
        let killed_id = killed_ids[0];
        map[killed_id].player.killer = killer_id;
        if (!map[killer_id].player.is_bot) {
            let ret_value = [merge_routes(killer_id, killed_id), killed_ids]
            return ret_value;
        } else {
            if (map[killed_id].player.killing_list && map[killed_id].player.killing_list.length > 0)
            {
                let ret_value = [seperate_routes(killed_id), killed_ids]
                return ret_value;
            }
        }
    }

    return [[], killed_ids];
}

function detect_collisions() {
    let updated_routes = [];
    let killed_players = [];
    for (const x in x_map) {
        for (const y in x_map[x]) {
            let tiles = x_map[x][y];
            if (tiles.length > 1) {
                let ret_value = handle_collision(tiles);
                updated_routes = updated_routes.concat(ret_value[0]);
                killed_players = killed_players.concat(ret_value[1]);
            } 
        }
    }
    return [Array.from(new Set(updated_routes)), Array.from(new Set(killed_players))];
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
exports.init_map = init_map;