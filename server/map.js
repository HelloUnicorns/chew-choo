const { performance } = require('perf_hooks');

const constants = require('../common/constants.js');
const {get_rails, init_rails} = require('./rail.js');
const { exception, assert } = require('console');
const { Train } = require('./train.js');
const {makeid} = require('../common/id.js');

let map = {};
let rail_id_to_route = {};

function print_bordering_routes(route_id) {
    let id = route_id;
    let f = routes.get_bordering_routes;
    console.log(`
        ${f(id, 'up-left')}  ${f(id, 'up-right')}        
          ${id}
        ${f(id, 'down-left')}  ${f(id, 'down-right')}
    `);
}

function init_route(rail_id) {
    let id = makeid();
    
    map[id] = {
        id: id,
        allocatable: true, /* Whether a human player can allocate this route or not */
        train: new Train(id),
        rail: get_rails()[rail_id]
    };

    rail_id_to_route[rail_id] = map[id];
}

/* Hand the route over from a human to a bot or vice versa */
function handover_route(route_id) {
    let route = map[route_id];
    let old_id = route.id;
    let old_train_position_in_route = route.train.position_in_route;
    let old_train_position_fraction = route.train.position_fraction;
    let rail_id = route.rail.id;

    /*  Deconstruct current route
            in order to minimize the chances of old human/bot moves being registered */
    route.train.free();
    route.id = undefined;
    route.allocatable = undefined;
    route.train = undefined;
    route.rail = undefined;
    delete map[old_id];
    delete rail_id_to_route[rail_id];

    /* Construct the new route */
    init_route(rail_id);
    let new_route = rail_id_to_route[rail_id];
    new_route.train.position_in_route = old_train_position_in_route;
    new_route.train.position_fraction = old_train_position_fraction;

    return new_route;
}

/* A human player was killed and all the routes it killed now come back to life */
function revive_route(route) {
    let new_route = handover_route(route.id);
    let {position_in_route, position_fraction} = Train.bot_position(Object.values(map).map((route) => route.train));
    new_route.position_in_route = position_in_route;
    new_route.position_fraction = position_fraction;
    return new_route;
}

/* Get a route for a human player */
function allocate_route() {
    let route = undefined;
    for (const _r of Object.values(map)) {
        if (!_r.allocatable) {
            continue;  
        }

        route = handover_route(_r.id);
        route.allocatable = true;
        route.train.is_bot = false;
        route.train.is_stopped = true;

        break;
    }

    return route.id;
}

/* A human player or a bot got killed */
function disable_route(route) {
    route.train.free();
    route.train.active = false;
    route.allocatable = false;
}

function start_playing(route_id) {
    map[route_id].train.is_stopped = false;
}

function init() {
    init_rails();
    for (let i = 0; i < constants.NUMBER_OF_ROUTES; ++i) {
        init_route(i);
    }
}

function occupy_train_location(route) {
    let locomotive_position = route.train.position_in_route;
    let collisions = [];

    /* Locomotive */
    let loco_collision = route.rail.occupy(locomotive_position);
    if (loco_collision) {
        collisions.push({
            routes: [route, rail_id_to_route[loco_collision]],
            coordinates: route.rail.coordinates(locomotive_position)
        });
    }
    

    /* Last cart */
    let last_cart_position = (locomotive_position - route.train.length + 1 + route.rail.length()) % route.rail.length();
    let cart_collision = route.rail.occupy(last_cart_position);
    if (cart_collision && cart_collision != loco_collision) {
        collisions.push({
            routes: [route, rail_id_to_route[cart_collision]],
            coordinates: route.rail.coordinates(last_cart_position)
        });
    }

    /* Tile ahead of locomotive */
    if (route.train.position_fraction) {
        /* I don't believe in this entering feature, let's try to not use it */
        /* TODO: delete if proven right */
        //collisions.push(route.rail.occupy((locomotive_position + 1) % route.rail.length(), entering=true));
    }

    /* Tile behind last cart */
    route.rail.free((locomotive_position - route.train.length + route.rail.length()) % route.rail.length());

    return collisions;
}

function grid_distance(point0, point1) {
    return Math.abs(point0.x - point1.x) + Math.abs(point0.y - point1.y);
}

function handle_collision(routes, coordinates) {
    let _update = {
        routes: [],
        kill: {
            killed_route_id: undefined,
            killer_route_id: undefined
        }
    };
        
    if (routes.some(route => !route.train.collisionable())) {
        return undefined;
    }

    if (routes.every(route => route.train.is_bot)) {
        /* Should not happen */
        console.log(`WARN: bot ${routes[0].id} and bot ${routes[1].id} collided`);
        return undefined;
    }

    /* We assume both trains passed the crossing point and the trains are not about as long as
        the rail itself, so adding the position fraction to the distance should work */
    const distances = routes.map((route) => 
        grid_distance(coordinates,
                      route.rail.coordinates(route.train.position_in_route))
        + route.train.position_fraction);
    
    let killer = undefined;
    let killee = undefined;

    if (distances[0] < distances[1]) {
        killer = routes[0];
        killee = routes[1]
    } else {
        killer = routes[1];
        killee = routes[0]
    }

    _update.kill.killer_route_id = killer.id;
    _update.kill.killed_route_id = killee.id;

    if (killer.train.is_bot) {
        console.log(`Train in rail ${killee.rail.id} got killed by a bot`);
        let new_rails = killer.rail.separate();
        for (const rail_id of new_rails) {
            revive_route(rail_id_to_route[rail_id]);
            _update.routes.push({route_id: rail_id_to_route[rail_id].id, tiles: rail_id_to_route[rail_id].rail.tracks});
        }
    } else {
        console.log(`Train in rail ${killee.rail.id} got killed by a human player`);
        let {position, old_rails} = killer.rail.merge(killee.rail, killer.train.position_in_route);
        killer.train.position = position;
        for (const rail_id of old_rails) {
            disable_route(rail_id_to_route[rail_id]);
            _update.routes.push({route_id: rail_id_to_route[rail_id].id, tiles: rail_id_to_route[rail_id].rail.tracks});
        }

        /* Also report update of the killer rail */
        _update.routes.push({route_id : killer.id, tiles: killer.rail.tracks});
    }

    return _update;
}

/* Periodic update of the map */
function update() {
    let routes_removed_leftover = [];
    let collision_updates = [];

    Train.update_time();

    for (const route of Object.values(map)) {
        if (!route.train.active || route.train.is_stopped) {
            continue;
        }

        /* Periodic update of speed and position */
        if (route.train.update(route.rail)) {
            /* Update caused rail change */
            routes_removed_leftover.push({route_id: route.id, tiles: route.rail.tracks});
        };

        
        let collision = occupy_train_location(route);
        /* Theoretically it's possible, but practically it should not happen.
            Let's keep the assert for now */
        assert(collision.length <= 1, '2 or more collisions occurred in the same rail');
        
        if (collision.length == 0) {
            continue;
        }

        let collision_update = handle_collision(collision[0].routes, collision[0].coordinates);
        if (collision_update) {
            collision_updates.push(collision_update);
        }
    }

    return {
        removed_leftover: routes_removed_leftover, 
        collision_updates: collision_updates.reduce(
            (updates, _update) => {
                updates.kills.push(_update.kill);
                updates.routes = updates.routes.concat(_update.routes);
                return updates;
            }, {kills: [], routes: []})
    };
}

function is_speed_up(speed_message_value) {
    return speed_message_value & constants.SPEED_UP_FLAG;
}

function is_speed_down(speed_message_value) {
    return speed_message_value & constants.SPEED_DOWN_FLAG;
}

function update_speed_change(route_id, speed_message_value) {
    map[route_id].train.is_speed_up = is_speed_up(speed_message_value);
    map[route_id].train.is_speed_down = is_speed_down(speed_message_value);
}

function get_state_update() {
    return Object.values(map).filter(
        (route) => route.train.active).reduce(
        (_update, route) => {
            _update[route.id] = {
                train: {
                    position_in_route: route.train.position_in_route,
                    position_fraction: route.train.position_fraction,
                    length: route.train.length,
                    speed: route.train.speed,
                    is_stopped: route.train.is_stopped,
                    invincibility_state: route.train.invincibility_state,
                    is_speed_up: route.train.is_speed_up,
                    is_speed_down: route.train.is_speed_down,
                    is_bot: route.train.is_bot,
                    killed: !route.train.active,
                },
                tracks: route.rail.tracks
            }
            return _update;
        }, {}
    );
}

function winner() {
    let alive = Object.values(map).filter((route) => route.train.active);
    if (alive.length > 1) {
        return undefined;
    } else if (alive.length == 0) {
        throw new Exception('No active user alive!');
    }

    return alive[0].id;
}

exports.init = init;
exports.get_state_update = get_state_update;
exports.allocate_route = allocate_route;
exports.update = update;
exports.update_speed_change = update_speed_change;
exports.handover_route = handover_route;
exports.start_playing = start_playing;


exports.winner = winner;