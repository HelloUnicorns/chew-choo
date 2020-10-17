const { GameClient } = require('./game_client.js');
const { Train } = require('./train.js');
const { performance } = require('perf_hooks');
const _ = require('lodash');

class GameManager {
    constructor(ws_server) {
        this.ws_server = ws_server;
        this.intervals = [];
        this.game_clients = {};

        this.ws_server.on('connection', (ws_client) => this.handle_new_client(ws_client));
    }

    handle_new_client(ws_client) {
        if (!this.has_active_players()) {
            console.log('New client arrived - starting game');
            this.start();
        }
        let train = Train.allocate();
        let game_client = new GameClient(ws_client, train);
        this.game_clients[game_client.id] = game_client;
    }

    get active_clients() {
        return Object.values(this.game_clients).filter(game_client => !game_client.removed);
    }
    
    has_active_players() {
        return this.active_clients.length > 0;
    }

    broadcast_event(event) {
        this.active_clients.forEach(game_client => game_client.send_event(event));
    }

    get_game_client(id) {
        return this.active_clients.find(game_client => game_client.player.id == id);
    }
    
    game_tick() {
        if (!this.has_active_players()) {
            console.log('No active players - stopping game');
            this.stop();
            return;
        }

        let { kills, routes } = Train.update();
        let update = Train.state;
        for (const train_id in update) {
            delete update[train_id].tracks;
            if (train_id in routes) {
                update[train_id].tracks = routes[train_id];
            }
        }

        if (kills.length > 0) {
            this.broadcast_event({ kills, type: 'kill' });

            kills.forEach(kill => {
                console.log(`killed: ${kill.killed_route_id}, killer: ${kill.killer_route_id}`);
                let game_client = this.get_game_client(kill.killed_route_id);
                if (game_client) {
                    game_client.leave();
                }
            });
        }

        /* TODO: update server-client protocol to handle partial positions
        for (const player of Player.all) {
            send_event(player.client, {locations: player.get_position_update(), changed_routes, type: 'position'});
        }*/

        this.broadcast_event({ routes: update, type: 'position' });

        this.check_win_condition();
    }

    check_win_condition() {
        let alive_trains = Object.values(Train.active_trains);
        if (alive_trains.length != 1) {
            return;
        }
        
        let winner_train = alive_trains[0];
        let winner = this.get_game_client(winner_train.id);

        /* Victory! :) */
        console.log(`Player in route ${winner.player.train.id} win!`);

        winner.send_win_event();
        winner.leave();
    }

    start() {
        console.log("Game started");
        Train.init();
        /* Time updates */
        this.intervals.push(setInterval(() => {
            this.broadcast_event({ time: performance.now(), type: 'time' });
        }, 1000 / 10));
    
        /* Position and kill */
        this.intervals.push(setInterval(() => this.game_tick(), 1000 / 60));
    
    }
    
    stop() {
        this.intervals.forEach(clearInterval);
        console.log("Game stopped");
    }
}

exports.GameManager = GameManager;