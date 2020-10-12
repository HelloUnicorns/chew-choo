const _ = require('lodash');
const { wss } = require('./server.js');
const constants = require('../common/constants.js');
const { performance } = require('perf_hooks');
const map = require('./map.js');

client_event_handlers = {}

/* Clients functions */
function get_client(route_id) {
    let client = wss.clients.filter((client) => client_route_id == route_id).filter(is_active_client);
    return client.length == 0 ? undefined : client[0];
}

function is_active_client(client) {
    return client.initialized || !client.removed;   
}

function get_active_clients() {
    return wss.clients.filter(is_active_client);
}

/* Event sending functions */
function send_event(client, event) {
    client.send(JSON.stringify(event));
}

function broadcast_event(event) {
    get_active_clients().forEach((client) => send_event(client, event));
}

/* Player handlers */
class Player {
    constructor (client, route_id) {
        this.route_id = route_id;
        this.client = client;
    }

    remove_start_playing_timeout() {
        clearTimeout(this.start_playing_event_timeout);
        this.start_playing_event_timeout = undefined;
    }

    register_start_playing_event_timeout() {
        this.start_playing_event_timeout = setTimeout(() => {
            console.log(`Client ${this.client.id} did not send start game event - got removed`);
            this.client.removed = true;
            map.handover_route(this.route_id);
        }, constants.START_PLAYING_EVENT_TIMEOUT_MS);
    }

    start_playing() {
        this.remove_start_playing_timeout();
        map.start_playing(this.route_id);
    }

    update_speed_change(event) {
        map.update_speed_change(this.route_id, event.value);
    }
}

client_event_handlers.latency_update = (client, event) => {
    let latency = (performance.now() - event.prev_server_time) / 2;
    send_event(client, { latency, type: 'latency' });
}

/* First thing first - init the map */
map.init();

wss.on('connection', (client) => {
    let route_id = map.allocate_route();
    
    if (route_id == undefined) {
        // All routes are occupied
        send_event(client, {
            message: 'Server is full',
            type: 'error'
        });
        console.log('Server is full - refused new client');
        return;
    }

    client.id = makeid();
    client.route_id = route_id;
    client.initialized = true;
    client.removed = false;

    let player = new Player(client, route_id);
    player.register_start_playing_event_timeout();

    console.log(`Client ${client.id} connected`);
    console.log(`Client ${client.id} occupies route ${client.route_id}`);
    send_event(client, {
        client_id: client.id,
        type: 'connection',
        map: map.get_state_update().map(route => ({tiles: route.tracks, player: route.train})),
        route_id: client.route_id
    });

    client.on('close', () => {
        if (client.removed) {
            console.log(`Removed client ${client.id} disconnected`)
            return;
        }

        console.log(`Client ${client.id} disconnected`);
        map.handover_route(route_id);
    });

    client.on('message', (json_data) => {
        const message = JSON.parse(json_data);

        if (client.removed) {
            console.warning(`Removed client ${client.id} sent message ${message.type}`)
            return;
        }
        if (message.type in client_event_handlers) {
            client_event_handlers[message.type](client, message);
        }
        if (message.type in player) {
            if (player.client != client) {
                console.warning(`Client ${client.id} sent message ${message.type} but is no longer controlling ${route_id}`);
                return;
            }
            /* JS is such a broken language */
            player[message.type](message);
        }
    });
});


setInterval(() => {
    broadcast_event({ time: performance.now(), type: 'time' });
}, 1000 / 10);


/* Position and kill */
setInterval(() => {
    let {removed_leftover, collision_updates} = map.update();
    let state = map.get_state_update().map((state) => state.train);

    broadcast_event({ locations: state, changed_routes: removed_leftover, type: 'position' });

    if (collision_updates.kill.length == 0) {
        return;
    }

    broadcast_event({ routes: collision_updates.routes, kills: collision_updates.kill, type: 'kill' });

    collision_updates.kill.forEach(kill => {
        console.log(`killed: ${kill.killed_route_id}, killer: ${kill.killer_route_id}`);
        let client = get_client(kill.route_id);
        if (client) {
            client.removed = true;
        }
    });
}, 1000 / 60);

/* Check win condition */
setInterval(() => {
    let winner = map.winner();
    if (!winner) {
        return;
    }

    /* Victory! :) */
    console.log(`Player in route ${winner} win!`);

    let client = get_client(winner);
    if (client) {
        send_event(client, { type: 'win' }); 
        client.removed = true;
        client.route_id = undefined;
    }

    assert(get_active_clients().length == 0, 'Found leaking clients');

    /* Reset map */
    console.log('Reseting map');
    map.init();
}, 1000 / 10);

