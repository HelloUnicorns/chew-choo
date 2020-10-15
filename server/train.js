
const { performance } = require('perf_hooks');
const assert  = require('assert');

const {makeid} = require('../common/id.js');
const constants = require('../common/constants.js');
const { calculate_speed_and_position, set_train_position } = require('../common/position.js');

const {get_rails, init_rails} = require('./rail.js');

let trains = {};
let rail_id_to_train = {};

function grid_distance(point0, point1) {
    return Math.abs(point0.x - point1.x) + Math.abs(point0.y - point1.y);
}

class Train {
    constructor(rail, allocated=false) {
        /* Base attributes */
        this.id = makeid();
        this.rail = rail;

        /* Status attributes */
        this.active = true;
        this.is_stopped = false;
        this.allocatable = true;

        /* Game attributes */
        this.position_in_route = 0;
        this.position_fraction = 0;
        this.last_position_update = Train.time;
        this.is_in_leftover = false;
        this.length = 3;
        this.speed = constants.MIN_SPEED; /* in tiles per second */
        this.is_speed_up = false;
        this.is_speed_down = false;
        this.invincibility_state = constants.TRAIN_NOT_INVINCIBLE;
        this.invincibility_timeout = undefined;
        this.kill_notified = false;
        this.is_bot = true;
        this.acceleration = constants.DEFAULT_START_ACCELERATION; /* Isn't passed to the client; but required for calculate_speed_and_position */        

        /* Update maps */
        trains[this.id] = this;
        rail_id_to_train[this.rail.id] = trains[this.id];

        if (allocated) {
            this.#allocate();
        }
    }

    #make_invincible = () => {
        clearTimeout(this.invincibility_timeout);

        this.invincibility_state = constants.TRAIN_FULLY_INVISIBLE_TIME;
        /* Start fully invisible timer */
        this.invincibility_timeout = setTimeout(
            () => {
                this.invincibility_state = constants.TRAIN_BLINKING;
                /* Start blinking timer */
                this.invincibility_timeout = setTimeout(
                    () => {
                        /* Train is not invincible anymore */
                        this.invincibility_state = constants.TRAIN_NOT_INVINCIBLE;
                    }, constants.TRAIN_BLINKING_TIME_MS);
            }, constants.TRAIN_FULLY_INVISIBLE_TIME_MS);
    }

    #make_vincible = () => {
        clearTimeout(this.invincibility_timeout);
        this.invincibility_state = constants.TRAIN_NOT_INVINCIBLE
    }

    #allocate = () => {
        this.is_bot = false;
        this.allocatable = false;
        this.is_stopped = true;
        this.reported = false;
        this.#make_invincible();
    }

    #destruct = () => {
        this.#make_vincible();
        delete trains[this.id];
        delete rail_id_to_train[this.rail.id];
    
        this.id = undefined;
        this.rail = undefined;
    }

    get collidable() {
        return this.active && this.invincibility_state == constants.TRAIN_NOT_INVINCIBLE;
    }

    /* Periodic updates */
    update() {
        let length = this.is_in_leftover ? Infinity : this.rail.length();
        calculate_speed_and_position(this, length, Train.time);

        if (this.is_in_leftover) {
            if (this.position_in_route >= this.rail.leftover_length()) {
                /* Train has just left the leftover */
                set_train_position(this, this.position_in_route - this.rail.leftover_length(), this.rail.length());
                this.rail.clear_leftover();
                this.is_in_leftover = false;
                return true;
            }
        }

        return false;
    }

    /* Hand the train over from a human to a bot or vice versa */
    handover(allocated=false) {
        let rail_id = this.rail.id;
        let position_in_route = this.position_in_route;
        let position_fration = this.position_fraction;
        this.#destruct();

        /* From this point we should not address 'this' at all */

        let new_train = new Train(get_rails()[rail_id], allocated=allocated);
        new_train.position_in_route = position_in_route;
        new_train.position_fraction = position_fration;

        console.log(`Rail ${new_train.rail.id} is now owned by ${new_train.id}`);

        return new_train;
    }

    /* This train got killed */
    kill() {
        this.#make_vincible();
        this.active = false;
        this.allocatable = false;
    }

    /* Train was abandoned by a human player (killed by a bot or left the game) */
    #abandon = () => {
        let _update = {
            routes: [],
            kill: {
                killed_route_id: this.id,
                killer_route_id: undefined
            }
        };
    
    
        let {position_in_route, position_fraction} = Train.bot_position();
    
        let rail_ids = this.rail.separate();
        for (const rail_id of rail_ids) {
            let new_train = rail_id_to_train[rail_id].handover();
            new_train.position_in_route = position_in_route;
            new_train.position_fraction = position_fraction;
            /* TODO: separate tracks and leftover tracks after we update the server-client protocol */
            _update.routes.push({route_id: new_train.id, tiles: new_train.rail.leftover_tracks.concat(new_train.rail.tracks)});
        }
    
        return _update;
    }

    occupy_location() {
        let locomotive_position = this.position_in_route;
        let collisions = [];
    
        /* Locomotive */
        let loco_collision = this.rail.occupy(locomotive_position);
        if (loco_collision) {
            collisions.push({
                trains: [this, rail_id_to_train[loco_collision]],
                coordinates: this.rail.coordinates(locomotive_position)
            });
        }
    
        /* Last cart */
        let last_cart_position = (locomotive_position - this.length + 1 + this.rail.length()) % this.rail.length();
        let cart_collision = this.rail.occupy(last_cart_position);
        if (cart_collision && cart_collision != loco_collision) {
            collisions.push({
                trains: [this, rail_id_to_train[cart_collision]],
                coordinates: this.rail.coordinates(last_cart_position)
            });
        }
    
        /* Tile behind last cart */
        this.rail.free((locomotive_position - this.length + this.rail.length()) % this.rail.length());
    
        return collisions;
    }

    static init() {
        Train.update_time();
        trains = {};
        rail_id_to_train = {};

        init_rails();
        let rails = get_rails();
        
        for (let i = 0; i < constants.NUMBER_OF_TRAINS; ++i) {
            new Train(rails[i]);
        }
    }

    static update_time() {
        Train.time = performance.now();
    }

    static bot_position() {
        let bot = Object.values(Train.all).find((train) => train.is_bot && train.active);
        if (bot) {
            return {
                position_in_route: bot.position_in_route,
                position_fraction: bot.position_fraction
            };
        }

        return {position_fraction: 0, position_fraction: 0};
    }

    static allocate() {
        for (const train of Object.values(Train.all)) {
            if (!train.allocatable) {
                continue;  
            }

            return train.handover(true);
        }
        return undefined;
    }

    static get(train_id) {
        if (train_id in Train.all) {
            return Train.all[train_id];
        }

        return undefined;
    }

    static get all() {
        return {...trains};
    }

    static get state() {
        return Object.values(Train.all).filter(
            (train) => train.active).reduce(
            (_update, train) => {
                _update[train.id] = {
                    train_attributes: {
                        position_in_route: train.position_in_route,
                        position_fraction: train.position_fraction,
                        length: train.length,
                        speed: train.speed,
                        is_stopped: train.is_stopped,
                        invincibility_state: train.invincibility_state,
                        is_speed_up: train.is_speed_up,
                        is_speed_down: train.is_speed_down,
                        is_bot: train.is_bot,
                        killed: !train.active,
                    },
                    tracks: train.rail.tracks
                }
                return _update;
            }, {}
        );
    }

    static #handle_collision = (trains_pair, coordinates) => {
        let _update = {
            routes: [],
            kill: {
                killed_route_id: undefined,
                killer_route_id: undefined
            }
        };
            
        if (trains_pair.some(train => !train.collidable)) {
            return undefined;
        }
    
        if (trains_pair.every(train => train.is_bot)) {
            /* Should not happen */
            console.log(`WARN: bot in rail ${trains_pair[0].rail.id} and bot in rail ${trains_pair[1].rail.id} collided`);
            return undefined;
        }
    
        /* We assume both trains passed the crossing point and the trains are not about as long as
            the rail itself, so adding the position fraction to the distance should work */
        const distances = trains_pair.map((train) => 
            grid_distance(coordinates,
                          train.rail.coordinates(train.position_in_route))
            + train.position_fraction);
        
        let killer = undefined;
        let killee = undefined;
    
        if (distances[0] < distances[1]) {
            killer = trains_pair[0];
            killee = trains_pair[1]
        } else {
            killer = trains_pair[1];
            killee = trains_pair[0]
        }
    
        let killer_id = killer.id;
        let killee_id = killee.id;
    
        if (killer.is_bot) {
            console.log(`Train in rail ${killee.rail.id} got killed by a bot`);
            _update = killee.#abandon();
        } else {
            console.log(`Train in rail ${killee.rail.id} got killed by a human player`);
            let {position, old_rails} = killer.rail.merge(killee.rail, killer.position_in_route);
            if (killer.rail.leftover_tracks.length > 0) {
                killer.is_in_leftover = true;
                console.log(`Route ${killer.id} in leftover`);
            }
            killer.position_in_route = position;
            for (const rail_id of old_rails) {
                let cur_train = rail_id_to_train[rail_id];
                cur_train.kill();
                /* TODO: separate tracks and leftover tracks after we update the server-client protocol */
                _update.routes.push({route_id: cur_train.id, tiles: cur_train.rail.leftover_tracks.concat(cur_train.rail.tracks)});
            }
    
            /* Also report update of the killer rail */
            /* TODO: separate tracks and leftover tracks after we update the server-client protocol */
            _update.routes.push({route_id : killer.id, tiles: killer.rail.leftover_tracks.concat(killer.rail.tracks)});
        }
    
        _update.kill.killer_route_id = killer_id;
        _update.kill.killed_route_id = killee_id;
    
        return _update;
    }

    static #update_before_movement = (changed_rails, collision_updates) => {
        /* Handle abandoned trains first */
        for (const train of Object.values(Train.all).filter(train => train.abandoned)) {
            collision_updates.push(train.#abandon());        
        }
    }

    static #update_movement = (changed_rails, collision_updates) => {
        Train.update_time();
    
        let train_ids = Object.keys(Train.all);
    
        /* Iterating over pre-generated list of ids since the current train ids might change during this loop */
        for (const train_id of train_ids) {
            let train = Train.get(train_id);
            if (!train) {
                /* This train no longer exists, skip it */
                continue;
            }
    
            if (!train.active || train.is_stopped) {
                continue;
            }
    
            /* Periodic update of speed and position */
            if (train.update()) {
                /* Update caused rail change */
                changed_rails.push({route_id: train.id, tiles: train.rail.tracks});
            };
    
            
            let collision = train.occupy_location();
            /* Theoretically it's possible, but practically it should not happen.
                Let's keep the assert for now */
            assert(collision.length <= 1, '2 or more collisions occurred in the same rail');
            
            if (collision.length == 0) {
                continue;
            }
    
            let collision_update = Train.#handle_collision(collision[0].trains, collision[0].coordinates);
            if (collision_update) {
                collision_updates.push(collision_update);
            }
        }
    }

    static #update_after_movement = (changed_rails, collision_updates) => {
        for (const train of Object.values(Train.all)) {
            if(!train.active) {
                continue;
            }
    
            if (!train.is_stopped && train.is_bot) {
                /* TODO: DELETE THIS LATER AFTER WE SOLVE THE BUG
                    DEBUG - CHECK ALL BOTS ARE IN SYNC */
                let current_pos = train.position_in_route + train.position_fraction;
                let bot_pos = Object.values(Train.bot_position()).reduce((a, b) => a + b , 0);
                let delta = Math.abs(current_pos - bot_pos);
                if (delta != 0) {
                    throw new Exception(`Bot ${train.id} in rail ${train.rail.id} drifted off`);
                }
            }
    
            if (!train.reported) {
                changed_rails.push({
                    route_id: train.id,
                    tiles: train.rail.tracks
                });
                train.reported = true;
            }
        }
    }

    static update() {
        let changed_rails = [];
        let collision_updates = [];
    
        Train.#update_before_movement(changed_rails, collision_updates);
        Train.#update_movement(changed_rails, collision_updates);
        Train.#update_after_movement(changed_rails, collision_updates);
        
    
        return {
            changed_routes: changed_rails, 
            collision_updates: collision_updates.reduce(
                (updates, _update) => {
                    updates.kills.push(_update.kill);
                    updates.routes = updates.routes.concat(_update.routes);
                    return updates;
                }, {kills: [], routes: []})
        };
    }
}

exports.Train = Train;