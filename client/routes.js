const _ = require('lodash');
const global_data = require('./global_data.js');
const { Track } = require('./track.js');
const { stop_blinking, start_blinking, build_train, draw_train, update_train, NORMAL_TRAIN_ALPHA, INVINCIBLE_TRAIN_ALPHA } = require('./train.js');
const constants = require('../common/constants.js');
let routes = {};

 class Route {
     constructor(player_id, train, is_own) {
         this.is_own = is_own;
         this.player_id = player_id;
         this.train = train;
         this.tracks = [];
         this.leftover_tracks = [];
     }

     remove_tracks() {
        for (let track of this.tracks) {
            track.remove();
        }
        this.tracks = [];
     }

     remove() {
         this.remove_train();
         this.remove_tracks();
     }

     remove_train() {
        if (this.train) {
            for (let sprite of this.train.sprites) {
                sprite.destroy();
            }
            if (this.is_own) {
                console.log('removed user train');
            }
            this.train = undefined;
        }
    }
    
    update() {
        if (this.train) {     
            update_train(this.train, this.tracks);
        }
     }

     draw_tracks() {
        for (let track of this.tracks) {
            track.draw();
        }
        for (let track of this.leftover_tracks) {
           track.draw();
       }
     }

     draw_train() {
        draw_train(this.train, this.tracks);
     }

     draw() {
         this.draw_tracks();
         this.draw_train();
     }

     get score() {
         return this.tracks.length;
     }

     update_tracks() {

     }
 }

export function remove_route(player_id) {
    routes[player_id].remove();
    delete routes[player_id];
}

export function get_route_by_player_id(player_id) {
    return routes[player_id];
}

export function get_tracks_by_player_id(player_id) {
    return routes[player_id].tracks;
}

export function get_train_by_player_id(player_id) {
    return routes[player_id].train;
}


export function draw_all_routes() {
    _.values(routes).forEach(route => route.draw());
}

export function update_all_routes() {
    _.values(routes).forEach(route => route.update());
}

/* TODO: this should be done inside the Train class */
export function update_server_train_state(train, server_location) {
    let cur_time = window.performance.now();

    let server_shadow_train = {
        position_fraction: server_location.position_fraction,
        position_in_route: server_location.position_in_route,
        speed: server_location.speed,
        is_speed_up: server_location.is_speed_up,
        is_speed_down: server_location.is_speed_down,
        last_position_update: cur_time,
        server_time: server_location.server_time,
    }

    train.is_stopped = server_location.is_stopped;
    train.is_bot = server_location.is_bot;

    if (train.invincibility_state != server_location.invincibility_state) {
        stop_blinking(train);
        switch (server_location.invincibility_state) {
            case constants.PLAYER_NOT_INVINCIBLE:
                train.alpha = NORMAL_TRAIN_ALPHA;
                break;
            case constants.PLAYER_BLINKING:
                start_blinking(train);
                break;
            case constants.PLAYER_FULLY_INVISIBLE:
                train.alpha = INVINCIBLE_TRAIN_ALPHA;
                break;
            default:
                console.error('Server sent bad invincibility state');
                break;
        }
    
        train.invincibility_state = server_location.invincibility_state;
    }
        
    if (!train.server_shadow_train && global_data.latency != 0) {
        train.position_fraction = server_shadow_train.position_fraction;
        train.position_in_route = server_shadow_train.position_in_route;
        train.last_position_update = cur_time;
    }

    if (global_data.latency != 0) {
        train.server_shadow_train = server_shadow_train;
    }
}

export function update_tracks_from_server(player_id, server_tracks) {
    if (server_tracks.length == 0) {
        if (player_id in routes) {
            console.log(`Removing route ${player_id}`);
            routes[player_id].remove();
            delete routes[player_id];
        }
        return;
    }
    if (!(player_id in routes)) {
        routes[player_id] = new Route(player_id, undefined, false); /* server will not re-build own tracks */
    }
    let route = routes[player_id];
    route.remove_tracks();
    route.tracks = server_tracks.map(server_track => Track.from_server_track(server_track, route.is_own));
    route.draw_tracks();
}

export function update_server_route(player_id, server_route, is_own) {
    if (!(player_id in routes)) {
        let train = build_train(player_id, server_route.player, is_own);
        routes[player_id] = new Route(player_id, train, is_own);
    }
    let route = routes[player_id];
    update_tracks_from_server(player_id, server_route.tiles);
    update_server_train_state(route.train, server_route.player);
}

export function get_number_of_routes() {
    return Object.keys(routes).length;
}

export function get_routes() {
    return routes;
}