const { wss } = require('./server.js');
const map = require('./map.js');
const { performance } = require('perf_hooks');

function get_random_tint() {
    return Math.random() * 0xffffff;
}

const ID_LEN = 8;

function get_random_round_trip() {
    // return (Math.floor(Math.random() * 50) + 50) * 2;
    // return 100;
    return 0;
}

function makeid(length) {
    /* https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript */
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

wss.on('connection', (client) => {
    client.id = makeid(ID_LEN);
    client.route_id = map.new_player(client.id);
    client.initialized = true;

    console.log(`Client ${client.id} connected`);
    console.log(`Client ${client.id} occupies route ${client.route_id}`);

    client.send(JSON.stringify({
            client_id: client.id,
            type: 'connection',
            map: map.map,
            route_id: client.route_id
    }));
    
    client.on('close', () => {
        console.log(`Client ${client.id} disconnected`);
        map.delete_player(client.id);
    });

    client.on('message', (json_data) => {
        let fake_latency = get_random_round_trip() / 2;
        setTimeout(() => {
            const message = JSON.parse(json_data);
            if (message.type == 'speed_change') {
                map.update_speed_change(client.route_id, message.value);
            }
            if (message.type == 'latency_update') {
                let latency = (performance.now() - message.prev_server_time) / 2;
                setTimeout(() => {
                    client.send(JSON.stringify({latency: latency, type: 'latency'}));
                }, fake_latency);
            }
        }, fake_latency);
    });
});

setInterval(() => {
    let fake_latency = get_random_round_trip() / 2;
    let current_time = performance.now();
    wss.clients.forEach((client) => {
        setTimeout(() => {
            client.send(JSON.stringify({time: current_time, type: 'time'}));
        }, fake_latency);
    });
}, 1000 / 10);

setInterval(() => {
    let fake_latency = get_random_round_trip() / 2;
    map.update_map();
    let locations = {};
    let server_time = performance.now();
    
    for (const [route_id, route] of Object.entries(map.map)) {
        locations[route_id] = {
            position_in_route: route.player.position_in_route,
            position_fraction: route.player.position_fraction,
            length: route.player.length,
            speed: route.player.speed,
            is_speed_up: route.player.is_speed_up,
            is_speed_down: route.player.is_speed_down,
            server_time
        };
    }
    setTimeout(() => {
        wss.clients.forEach((client) => {
            if (!client.initialized) {
                return;
            }
            client.send(JSON.stringify({ locations, type: 'position'}));
        });
    }, fake_latency);
}, 1000 / 60);
