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
        console.log("New client");
        if (!this.has_active_players()) {
            console.log('New client arrived - starting game');
            this.start();
        }
        let train = Train.allocate(performance.now());
        let game_client = new GameClient(ws_client, train);
        this.game_clients[game_client.id] = game_client;
    }

    get active_clients() {
        return Object.values(this.game_clients).filter(game_client => !game_client.removed);
    }
    
    has_active_players() {
        return this.active_clients.length > 0;
    }

    broadcast_message(message_type, message) {
        this.active_clients.forEach(game_client => game_client.send_message(message_type, message));
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

        /* removed non-active players */
        this.game_clients = this.active_clients;
        let update_time = performance.now();

        let events = Train.update(update_time);
        if (events.length) {
            let result = events.filter(event => (event.new_route));
            if (result.length > 0) {
                console.log("New routes:")
                console.log(result);
            }
            this.game_clients.forEach(game_client => {
                let events_for_client = events.filter(event => (!(event.new_route && event.new_route.route.id == game_client.player.id)));
                if (events_for_client) {
                    game_client.send_message('update', { 
                        server_time: update_time,
                        events: events_for_client
                    });
                }

                if (events.some(event => event.route_removed && event.route_removed.id == game_client.player.id)) {
                    game_client.leave();
                }
            });
        }

        this.check_win_condition();


    }

    check_win_condition() {
        let alive_trains = Train.active_trains;
        if (alive_trains.length != 1) {
            return;
        }
        
        let winner_train = alive_trains[0];
        let winner = this.get_game_client(winner_train.id);

        /* Victory! :) */
        console.log(`Player in route ${winner.player.train.id} win!`);

        winner.send_win_message();
        winner.leave();
    }

    start() {
        console.log("Game started");
        Train.init();
        /* Time updates */
        this.intervals.push(setInterval(() => {
            this.broadcast_message('time', { server_time: performance.now() });
        }, 1000 / 4));
    
        /* Position and kill */
        this.intervals.push(setInterval(() => this.game_tick(), 1000 / 60));
    
    }
    
    stop() {
        this.intervals.forEach(clearInterval);
        console.log("Game stopped");
    }
}

exports.GameManager = GameManager;