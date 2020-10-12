const { wss, get_active_clients, send_event, broadcast_event } = require('./server.js');
const { Player } = require('./player.js');
const { performance } = require('perf_hooks');
const map = require('./map.js');
const { makeid } = require('../common/id.js');

client_event_handlers = {};

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
    client.player = player;
    player.register_start_playing_event_timeout();

    console.log(`Client ${client.id} connected`);
    console.log(`Client ${client.id} occupies route ${client.route_id}`);

    let state = map.get_state_update();
    let old_naming_convention_state = Object.entries(state).reduce((result, [route_id, route]) => (
        result[route_id] = {tiles: route.tracks, player: route.train}, result
    ), {});

    send_event(client, {
        client_id: client.id,
        type: 'connection',
        map: old_naming_convention_state,
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
            console.warn(`Removed client ${client.id} sent message ${message.type}`)
            return;
        }
        if (message.type in client_event_handlers) {
            client_event_handlers[message.type](client, message);
        }
        else if (message.type in player) {
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
    let state = map.get_state_update();
    let trains = Object.entries(state).reduce((result, [route_id, route]) => (result[route_id] = route.train, result), {});

    broadcast_event({ locations: trains, changed_routes: removed_leftover, type: 'position' });

    if (collision_updates.kills.length == 0) {
        return;
    }

    broadcast_event({ routes: collision_updates.routes, kills: collision_updates.kills, type: 'kill' });

    collision_updates.kills.forEach(kill => {
        console.log(`killed: ${kill.killed_route_id}, killer: ${kill.killer_route_id}`);
        let player = Player.get(kill.killed_route_id);
        if (player) {
            player.client.removed = true;
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

    let client = Player.get(winner).client;
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

