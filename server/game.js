const _ = require('lodash');
const { wss } = require('./server.js');
const constants = require('../common/constants.js');
const { performance } = require('perf_hooks');
const map = require('./map.js');

const ID_LEN = 8;

function makeid(length) {
    /* https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript */
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

event_handlers = {}

function send_event(client, event) {
    client.send(JSON.stringify(event));
}

function remove_start_playing_timeout(player) {
    if (player.start_playing_event_timeout) {
        clearTimeout(player.start_playing_event_timeout);
        player.start_playing_event_timeout = undefined;
    }
}
function remove_invincibility_end_timeout(player) {
    if (player.invincibility_end_timeout) {
        clearTimeout(player.invincibility_end_timeout);
        player.invincibility_end_timeout = undefined;
    }
}

function remove_blink_start_timeout(player) {
    if (player.blink_start_timeout) {
        clearTimeout(player.blink_start_timeout);
        player.blink_start_timeout = undefined;
    }
}

event_handlers.start_playing = (player) => {
    player.is_stopped = false;

    remove_start_playing_timeout(player);

    /* start blinking timeout */
    player.blink_start_timeout = setTimeout(() => {
        console.log(`player at route ${player.client.route_id} starts blinking`);
        player.blink_start_timeout = undefined;
        player.invincibility_state = constants.PLAYER_BLINKING;

        /* start invincibility end timeout */
        player.invincibility_end_timeout = setTimeout(() => {
                player.invincibility_end_timeout = undefined;
                player.invincibility_state = constants.PLAYER_NOT_INVINCIBLE;
            }, constants.PLAYER_BLINKING_TIME_MS);
    }, constants.PLAYER_FULLY_INVISIBLE_TIME_MS);
}

event_handlers.speed_change = (player, event) => {
    map.update_speed_change(player.client.route_id, event.value);
}

event_handlers.latency_update = (player, event) => {
    let latency = (performance.now() - event.prev_server_time) / 2;
    send_event(player.client, { latency, type: 'latency' });
}

function get_train_info(player) {
    return {
        position_in_route: player.position_in_route,
        position_fraction: player.position_fraction,
        length: player.length,
        speed: player.speed,
        is_stopped: player.is_stopped,
        invincibility_state: player.invincibility_state,
        is_speed_up: player.is_speed_up,
        is_speed_down: player.is_speed_down,
        is_bot: player.is_bot
    }
}

function remove_player(route_id) {
    if (!(route_id in map.map)) {
        /* already removed */
        return;
    }
    let player = map.map[route_id].player;

    console.log(`Player in route ${route_id} removed`);
    if (player.client) {
        player.client.removed = true;
        player.client.route_id = undefined;
        player.client = undefined;
    }
    remove_start_playing_timeout(player);
    remove_blink_start_timeout(player);
    remove_invincibility_end_timeout(player);
}

function remove_player_and_replace_with_bot(route_id) {
    remove_player(route_id);
    map.replace_player_with_bot(route_id);
}

function register_start_playing_event_timeout(route_id) {
    let player = map.map[route_id].player;
    let client = player.client;
    player.start_playing_event_timeout = setTimeout(() => {
        console.log(`Client ${client.id} did not send start game event`);
        remove_player_and_replace_with_bot(route_id);
    }, constants.START_PLAYING_EVENT_TIMEOUT_MS);
}

wss.on('connection', (client) => {
    let route_id = map.new_player();
    let player = map.map[route_id].player;
    client.id = makeid(ID_LEN);
    if (route_id == undefined) {
        // All routes are occupied
        send_event(client, {
            message: 'Server is full',
            type: 'error'
        });
        console.log('Server is full - refused new client');
        return;
    }

    player.client = client;
    client.route_id = route_id;
    client.initialized = true;
    client.removed = false;
    player.is_stopped = true;
    player.invincibility_state = constants.PLAYER_FULLY_INVISIBLE;

    register_start_playing_event_timeout(route_id);

    console.log(`Client ${client.id} connected`);
    console.log(`Client ${client.id} occupies route ${client.route_id}`);
    send_event(client, {
        client_id: client.id,
        type: 'connection',
        map: _.mapValues(map.map, route => {
            return {
                tiles: route.tiles, 
                player: get_train_info(route.player)
            };
        }),
        route_id: client.route_id
    });

    client.on('close', () => {
        if (client.removed) {
            console.log(`Removed client ${client.id} disconnected`)
            return;
        }

        console.log(`Client ${client.id} disconnected`);
        remove_player_and_replace_with_bot(route_id);
    });

    client.on('message', (json_data) => {
        const message = JSON.parse(json_data);

        if (client.removed) {
            console.log(`Removed client ${client.id} sent message ${message.type}`)
            return;
        }
        if (message.type in event_handlers) {
            event_handlers[message.type](player, message);
        }
    });
});


setInterval(() => {
    let current_time = performance.now();
    wss.clients.forEach((client) => {
        if (!client.initialized || client.removed) {
            return;
        }
        send_event(client, { time: current_time, type: 'time' });
    });
}, 1000 / 10);


/* Position */
setInterval(() => {
    let routes_removed_leftover = map.update_map();
    let locations = {};

    for (const [route_id, route] of Object.entries(map.map)) {
        if (!route.player.killed && !route.player.free) {
            locations[route_id] = get_train_info(route.player);
        }
    }

    wss.clients.forEach((client) => {
        if (!client.initialized || client.removed) {
            return;
        }

        send_event(client, { locations, changed_routes: routes_removed_leftover, type: 'position' });
    });
}, 1000 / 60);

/* Kills */
setInterval(() => {
    let updates = map.detect_collisions();

    if (updates.kill.length == 0) {
        return;
    }

    console.log(`Printing kill list`);
    updates.kill.forEach(kill => {
        console.log(`killed: ${kill.killed_route_id}, killer: ${kill.killer_route_id}`);
        if (!map.map[kill.killer_route_id].player.is_bot) {
            /* If the killer is a player, the killee's route gets merged into the killer's one */
            remove_player(kill.killed_route_id);
            delete map.map[kill.killed_route_id];
        }
        /* If the killer is  bot, we just deconstruct the killee's route and spawn new bots */
    });

    /* Update kills */
    wss.clients.forEach((client) => {
        if (!client.initialized || client.removed) {
            return;
        }

        send_event(client, { routes: updates.routes, kills: updates.kill, type: 'kill' });
    });
}, 1000 / 60);

/* Check win condition */
setInterval(() => {
    let route_ids = Object.keys(map.map);
    if (route_ids.length > 1) {
        /* More than 1 player remaining */
        return;
    }

    /* Victory! :) */
    let winner_route_id = route_ids[0];
    console.log(`Player in route ${winner_route_id} win!`);

    wss.clients.forEach((client) => {
        if (!client.initialized || client.removed) {
            return;
        }
        if (client.route_id == winner_route_id) {
            send_event(client, { type: 'win' });
            client.removed = true;
            client.route_id = undefined;
        }
    });

    /* Reset map */
    console.log('Reseting map');
    map.init_map();
}, 1000 / 10);
