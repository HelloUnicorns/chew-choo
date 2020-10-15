const { wss, get_active_clients, send_event, broadcast_event } = require('./server.js');
const { Player } = require('./player.js');
const { Train } = require('./train.js');

const { performance } = require('perf_hooks');
const assert  = require('assert');

client_event_handlers = {};
let intervals = [];

client_event_handlers.latency_update = (client, event) => {
    let latency = (performance.now() - event.prev_server_time) / 2;
    send_event(client, { latency, type: 'latency' });
}

wss.on('connection', (client) => {
    client.initialized = true;
    client.removed = false;
    if (get_active_clients().length == 1) {
        start();
    }

    let train = Train.allocate();

    if (train == undefined) {
        // All routes are occupied
        send_event(client, {
            message: 'Server is full',
            type: 'error'
        });
        console.log('Server is full - refused new client');
        return;
    }

    client.id = train.id;

    client.player = new Player(client, train);

    console.log(`Client ${client.id} connected`);
    console.log(`Client ${client.id} occupies train ${client.player.train.id}`);

    let state = Train.state;
    let old_naming_convention_state = Object.entries(state).reduce((result, [train_id, item]) => (
        result[train_id] = {tiles: item.tracks, player: item.train_attributes}, result
    ), {});

    send_event(client, {
        client_id: client.id,
        type: 'connection',
        map: old_naming_convention_state,
        route_id: client.id
    });

    client.on('close', () => {
        if (client.removed) {
            console.log(`Removed client ${client.id} disconnected`)
            return;
        }

        console.log(`Client ${client.id} disconnected`);
        client.player.leave();

        if (get_active_clients().length == 0) {
            stop();
        }
    });

    client.on('message', (json_data) => {
        const message = JSON.parse(json_data);

        if (client.removed) {
            // console.warn(`Removed client ${client.id} sent message ${message.type}`)
            return;
        }
        if (message.type in client_event_handlers) {
            client_event_handlers[message.type](client, message);
        }

        client.player.handle_event(message.type, message);
    });
});


function start() {
    console.log("Game started");
    Train.init();
    /* Time updates */
    intervals.push(setInterval(() => {
        broadcast_event({ time: performance.now(), type: 'time' });
    }, 1000 / 10));

    /* Position and kill */
    intervals.push(setInterval(() => {
        let {changed_routes, collision_updates} = Train.update();
        let state = Train.state;
        let trains = Object.entries(state).reduce((result, [train_id, item]) => (result[train_id] = item.train_attributes, result), {});

        if (collision_updates.kills.length > 0) {
            broadcast_event({ routes: collision_updates.routes, kills: collision_updates.kills, type: 'kill' });

            collision_updates.kills.forEach(kill => {
                console.log(`killed: ${kill.killed_route_id}, killer: ${kill.killer_route_id}`);
                let player = Player.get(kill.killed_route_id);
                if (player) {
                    player.leave();
                    if (get_active_clients().length == 0) {
                        stop();
                    }
                }
            });
        }

        /* TODO: update server-client protocol to handle partial positions
        for (const player of Player.all) {
            send_event(player.client, {locations: player.get_position_update(), changed_routes, type: 'position'});
        }*/
        broadcast_event({ locations: trains, changed_routes, type: 'position' });
    }, 1000 / 60));

    /* Check win condition */
    intervals.push(setInterval(() => {
        let winner = Player.winner;
        if (!winner) {
            return;
        }
        stop();

        /* Victory! :) */
        console.log(`Player in route ${winner.train.id} win!`);

        let client = winner.client;
        send_event(client, { type: 'win' });

        winner.leave();

        assert(get_active_clients().length == 0, 'Found leaking clients');
    }, 1000 / 10));
}

function stop() {
    intervals.forEach(interval => clearInterval(interval));
    console.log("Game stopped");
}
