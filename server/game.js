const { wss } = require('./server.js');
const { performance } = require('perf_hooks');
const map = require('./map.js');

function get_random_tint() {
    return Math.random() * 0xffffff;
}

const ID_LEN = 8;

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
    route_id = map.new_player();
    if (route_id == undefined) {
        console.log('Error');
        return;
    }
    client.route_id = route_id;
    client.initialized = true;

    map.map[client.route_id].player.is_stopped = true;

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
        map.delete_player(client.route_id);
    });

    client.on('message', (json_data) => {
        const message = JSON.parse(json_data);
        if (message.type == 'speed_change') {
            map.update_speed_change(client.route_id, message.value);
        }
        else if (message.type == 'latency_update') {
            let latency = (performance.now() - message.prev_server_time) / 2;
            client.send(JSON.stringify({latency: latency, type: 'latency'}));
        }
        else if (message.type == 'resume_player') {
            map.map[client.route_id].player.is_stopped = false;
        }
    });
});

setInterval(() => {
    let current_time = performance.now();
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({time: current_time, type: 'time'}));
    });
}, 1000 / 10);

/* Position */
setInterval(() => {
    map.update_map();
    let locations = {};
    let server_time = performance.now();
    
    for (const [route_id, route] of Object.entries(map.map)) {
        if (!route.player.killed && !route.player.free) {
            locations[route_id] = {
                position_in_route: route.player.position_in_route,
                position_fraction: route.player.position_fraction,
                length: route.player.length,
                speed: route.player.speed,
                is_speed_up: route.player.is_speed_up,
                is_speed_down: route.player.is_speed_down,
                server_time: server_time
            };
        }
    }
    wss.clients.forEach((client) => {
        if (!client.initialized) {
            return;
        }

        client.send(JSON.stringify({ locations, type: 'position'}));
    });
}, 1000 / 60);

/* Kills */
setInterval(() => {
    map.detect_collisions();
    let kills = [];
    
    for (const [route_id, route] of Object.entries(map.map)) {
        if (route.player.killed && !route.player.kill_notified) {
            route.player.kill_notified = true;
            map.delete_player(route_id);
            kills.push({killed_route_id: route_id, killer_route_id: route.player.killer});
        }
    }

    if (kills.length == 0) {
        return;
    }

    console.log(`Printing kill list`);
    kills.forEach(kill => {
        console.log(`killed: ${kill.killed_route_id}, killer: ${kill.killer_route_id}`);
    });

    /* Update tile changes */
    let routes = [];
    kills.forEach((kill) => {
        routes.push({
            route_id: kill.killer_route_id,
            tiles: (kill.killer_route_id == -1) ? undefined : map.map[kill.killer_route_id].tiles
        });
        routes.push({
            route_id: kill.killed_route_id,
            tiles: [] // Empty list
        });
    });

    /* Update kills */
    wss.clients.forEach((client) => {
        if (!client.initialized) {
            return;
        }

        client.send(JSON.stringify({routes, kills, type: 'kill'}));
    });
}, 1000 / 60);
