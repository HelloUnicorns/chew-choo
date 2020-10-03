const TRACK_WIDTH = 30;
const TRACK_HEIGHT = 21;

const START_X = 0;
const START_Y = 0;



let route_start_positions = [

];

let directions = ['right', 'down', 'left', 'up']
const MAX_PLAYERS = 65;

let map = {};
active_players = {};

const LOW_SPEED = 10;
const HIGH_SPEED = 30;

function build_rectangular_route(grid_x, grid_y, width, height) {
    let route = [];
    for (let i = 1; i < width - 1; i++) {
        route.push({x: grid_x + i, y: grid_y, direction_from: 'left', direction_to: 'right'});
    }

    route.push({x: grid_x + width - 1, y: grid_y, direction_from: 'left', direction_to: 'bottom'});
    
    for (let i = 1; i < height - 1; i++) {
        route.push({x: grid_x + width - 1, y: grid_y + i, direction_from: 'top', direction_to: 'bottom'});
    }

    route.push({x: grid_x + width - 1, y: grid_y + height - 1, direction_from: 'top', direction_to: 'left'});
    
    for (let i = width - 2; i > 0; i--) {
        route.push({x: grid_x + i, y: grid_y + height - 1, direction_from: 'right', direction_to: 'left'});
    }
    
    route.push({x: grid_x, y: grid_y + height - 1, direction_from: 'right', direction_to: 'top'});
    
    for (let i = height - 2; i > 0; i--) {
        route.push({x: grid_x, y: grid_y + i, direction_from: 'bottom', direction_to: 'top'});
    }

    route.push({x: grid_x, y: grid_y, direction_from: 'bottom', direction_to: 'right'});
 
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
            tiles: build_rectangular_route(start_position.x, start_position.y, TRACK_WIDTH, TRACK_HEIGHT),
            player: {
                engine_sprite: undefined,
                cart_sprites: [],
                train_route: [],
                position_in_route: 0,
                last_position_update: 0,
                position_fraction: 0,
                length: 3,
                speed: LOW_SPEED /* in tiles per second */
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

    let empty_route = undefined;
    for (let i = 0; i < MAX_PLAYERS; ++i) {
        if (empty_route === undefined  && !active_players[i]) {
            empty_route = i;
        }
        if (active_players[i] == player_id) {
            if (active_players[i].timeout) {
                clearTimeout(active_players[i].timeout);
            }
            entered = false;
            return i;
        } 
    }

    if (empty_route != undefined) {
        active_players[empty_route] = player_id;
        entered = false;
        return empty_route;
    }

    entered = false;
    return undefined;
}

function notify_player_disconnected(player_id) {
    for (const [route_id, current_player_id] of Object.entries(active_players)) {
        if (player_id == current_player_id) {
            active_players[route_id].timeout = setTimeout(() => {
                delete active_players[route_id];
                console.log(`Route ${route_id} is free`);
            }, 20 * 1000);
        }
    }
}

init_map();

exports.map = map;
exports.new_player = new_player;
exports.notify_player_disconnected = notify_player_disconnected;