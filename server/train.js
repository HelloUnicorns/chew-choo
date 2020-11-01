
const { performance } = require('perf_hooks');
const assert = require('assert');
const _ = require('lodash');

const { makeid } = require('../common/id.js');
const constants = require('../common/constants.js');
const { advance_train } = require('../common/position.js');

const { get_rails, init_rails } = require('./rail.js');

let trains = {};
let rail_id_to_train = {};

const LOSER_MODE = false;

function grid_distance(point0, point1) {
    return Math.abs(point0.x - point1.x) + Math.abs(point0.y - point1.y);
}

class Train {
    constructor(update_time, rail, is_bot=true) {
        /* Base attributes */
        this.id = makeid();
        this.rail = rail;

        /* Status attributes */
        this.active = true;
        this.is_stopped = false;
        this.allocatable = true;

        /* Game attributes */
        this.length = 3;
        this.invincibility_state = constants.TRAIN_NOT_INVINCIBLE;
        this.invincibility_timeout = undefined;
        this.kill_notified = false;
        this.is_bot = is_bot;
        this.position = 0;
        this.latest_speed_update = {
            update_type: constants.SpeedType.SPEED_CONSTANT,
            update_time,
            update_time_position: 0,
            update_time_speed: constants.MIN_SPEED,
        }
        this.postponed_events = []

        /* Update maps */
        trains[this.id] = this;
        rail_id_to_train[this.rail.id] = trains[this.id];


        if (!is_bot) {
            this.#allocate();
        }
    }
    
    get position_int() {
        /* TODO: maybe move to round instead of floor? */
        return Math.floor(this.position);
    }

    #invincibility_change_event() {
        return { invincibility_change: { id: this.id, new_invincibility_state: this.invincibility_state } };
    }

    #make_invincible = () => {
        clearTimeout(this.invincibility_timeout);

        this.invincibility_state = constants.TRAIN_FULLY_INVISIBLE;
        /* Start fully invisible timer */
        this.invincibility_timeout = setTimeout(
            () => {
                this.invincibility_state = constants.TRAIN_BLINKING;
                this.postponed_events.push(this.#invincibility_change_event());
                /* Start blinking timer */
                this.invincibility_timeout = setTimeout(
                    () => {
                        /* Train is not invincible anymore */
                        this.invincibility_state = constants.TRAIN_NOT_INVINCIBLE;
                        this.postponed_events.push(this.#invincibility_change_event());
                    }, constants.TRAIN_BLINKING_TIME_MS);
            }, constants.TRAIN_FULLY_INVISIBLE_TIME_MS);
    }

    #make_vincible = () => {
        clearTimeout(this.invincibility_timeout);
        this.invincibility_timeout = undefined;
        this.invincibility_state = constants.TRAIN_NOT_INVINCIBLE
    }

    #allocate = () => {
        this.is_bot = false;
        this.allocatable = false;
        this.is_stopped = true;
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

    #step(current_time, skip_updates=false) {
        const { end_position, end_speed, used_tracks } = 
            advance_train(current_time - this.latest_speed_update.update_time, this.latest_speed_update, 
                          this.length, this.rail.tracks, this.rail.leftover_tracks);
        let collisions;
        if (!skip_updates) {
            this.position = end_position;
            collisions = this.rail.occupy(used_tracks);
        }
        return { end_position, end_speed, used_tracks, collisions }
    }

    #do_route_update(update_time) {
        const { end_speed } = this.#step(update_time, true);
        this.latest_speed_update.update_time = update_time;
        this.latest_speed_update.update_time_position = this.position;
        this.latest_speed_update.update_time_speed = end_speed;
        return { route_update: { id: this.id, 
                                 tracks: this.rail.new_tracks_for_event(),
                                 latest_speed_update: _.clone(this.latest_speed_update),
            }
        };
    }

    change_speed(new_speed_type) {
        let update_time = performance.now();
        const { end_speed, end_position } = this.#step(update_time);
        this.latest_speed_update.update_time = update_time;
        this.latest_speed_update.update_time_position = end_position;
        this.latest_speed_update.update_time_speed = end_speed;
        this.latest_speed_update.update_type = new_speed_type;

        this.postponed_events.push({
            speed: { 
                id: this.id, 
                update: _.clone(this.latest_speed_update)
            }
        });
    }

    /* Periodic updates */
    update(update_time, collisions) {
        let events = this.postponed_events;
        this.postponed_events = [];
        const { collisions: new_collisions } = this.#step(update_time);
        
        collisions.push(...new_collisions.map(collision => ({
            trains: [this, rail_id_to_train[collision.rail_id]],
            coordinates: collision.coordinates
        })));
    
        return events;
    }

    /* Hand the train over from a human to a bot or vice versa */
    handover(update_time, is_bot=true, latest_speed_update=undefined) {
        let route_removed_event = { route_removed: { id: this.id } };
        let rail_id = this.rail.id;
        let position = this.position;
        if (!latest_speed_update) {
            latest_speed_update = this.latest_speed_update;
        }
        this.#destruct();

        /* From this point we should not address 'this' at all */

        let new_train = new Train(update_time, get_rails()[rail_id], is_bot);
        new_train.position = position;
        new_train.latest_speed_update = latest_speed_update;

        new_train.postponed_events.push(route_removed_event);
        new_train.postponed_events.push(new_train.#new_route_event());

        console.log(`Rail ${new_train.rail.id} is now owned by ${new_train.id}`);

        return new_train;
    }

    /* This train got killed */
    kill() {
        this.#make_vincible();
        this.active = false;
        this.allocatable = false;
    }

    #new_train_struct() {
        return { 
            length: this.length, 
            is_bot: this.is_bot,
            invincibility_state: this.invincibility_state,
            latest_speed_update: _.clone(this.latest_speed_update)
        };
    }

    #new_route_struct() {
        return {
            train: this.#new_train_struct(), 
            tracks: this.rail.new_tracks_for_event(),
            id: this.id
        };
    }

    #new_route_event() {
        return { new_route: { route: this.#new_route_struct() } }
    }

    /* Train was abandoned by a human player (killed by a bot or left the game) */
    #abandon(events, update_time) {
        if (!this.active) {
            /* Train already dead */
            return;
        }
        events.push({ route_removed: { id: this.id }});

        let bot_latest_speed_update = Train.bot_latest_speed_update(update_time);
    
        let rail_ids = this.rail.separate();
        for (const rail_id of rail_ids) {
            let new_train = rail_id_to_train[rail_id].handover(update_time, true, _.clone(bot_latest_speed_update));
            new_train.#step(update_time);
        }
    }

    static init() {
        let update_time = performance.now();
        trains = {};
        rail_id_to_train = {};

        init_rails();
        let rails = get_rails();
        
        for (let i = 0; i < constants.NUMBER_OF_TRAINS; ++i) {
            new Train(update_time, rails[i]);
        }
    }

    static bot_latest_speed_update(update_time) {
        let bot = Object.values(Train.all).find((train) => train.is_bot && train.active);
        if (bot) {
            return bot.latest_speed_update;
        }

        return {
            update_type: constants.SpeedType.SPEED_CONSTANT,
            update_time,
            update_time_position: 0,
            update_time_speed: constants.MIN_SPEED,
        }
    }

    static allocate(update_time) {
        for (const train of Object.values(Train.all)) {
            if (!train.allocatable) {
                continue;  
            }
            return train.handover(update_time, false);
        }
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

    static get active_trains() {
        return Object.values(Train.all).filter(train => train.active);
    }

    static get new_route_structs() {
        return Train.active_trains.map(train => train.#new_route_struct());
    }

    static #handle_collision = (trains_pair, coordinates, events, update_time) => {
        if (trains_pair.some(train => !train.collidable)) {
            return;
        }
    
        if (trains_pair.every(train => train.is_bot)) {
            /* Should not happen */
            console.log(`WARN: bot in rail ${trains_pair[0].rail.id} and bot in rail ${trains_pair[1].rail.id} collided`);
            return;
        }

        const distances = trains_pair.map((train) => 
            grid_distance(coordinates,
                          train.rail.coordinates_by_position(train.position)));
        
        let killer = undefined;
        let killee = undefined;
        if (LOSER_MODE && !trains_pair[0].is_bot && trains_pair[1].is_bot) {
            killer = trains_pair[0];
            killee = trains_pair[1];
        } else if (LOSER_MODE && !trains_pair[1].is_bot && trains_pair[0].is_bot) {
            killer = trains_pair[1];
            killee = trains_pair[0];
        } else if (distances[0] < distances[1]) {
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
            killee.#abandon(events, update_time);
        } else {
            console.log(`Train in rail ${killee.rail.id} got killed by a human player`);
            let {position, old_rails} = killer.rail.merge(killee.rail, killer.position_int, killer.length);
            killer.position = position;
            for (const rail_id of old_rails) {
                let cur_train = rail_id_to_train[rail_id];
                cur_train.kill();
                events.push({ route_removed: { id: cur_train.id }})
            }
            events.push(killer.#do_route_update(update_time));
        }
    }

    static #update_before_movement = (events, update_time) => {
        /* Handle abandoned trains first */
        for (const train of Object.values(Train.all).filter(train => train.abandoned)) {
            train.#abandon(events, update_time);
        }
    }

    static #update_movement = (events, update_time) => {    
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
    
            let collision = [];

            /* Periodic update of speed and position */
            events.push(...train.update(update_time, collision));
            
            /* Theoretically it's possible, but practically it should not happen.
                Let's keep the assert for now */
            assert(collision.length <= 1, '2 or more collisions occurred in the same rail');
            
            if (collision.length == 0) {
                continue;
            }
    
            Train.#handle_collision(collision[0].trains, collision[0].coordinates, events, update_time);
        }
    }

    static #update_after_movement = (events) => {
        for (const train of Object.values(Train.all)) {
            if(!train.active) {
                continue;
            }
        }
    }

    static update(update_time) {
        let events = [];

        Train.#update_before_movement(events, update_time);
        Train.#update_movement(events, update_time);
        Train.#update_after_movement(events, update_time);
    
        return events;
    }
}

exports.Train = Train;