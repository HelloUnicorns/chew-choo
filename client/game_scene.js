const global_data = require('./global_data.js');
const _ = require('lodash');
const constants = require('../common/constants.js');
const { Track } = require('./track.js');
const { Train } = require('./train.js');
const { Route } = require('./routes.js');
const { GameSocket } = require('./game_socket.js');
const { GRID_PIECE_WIDTH } = require('./grid.js');

const VERTICAL_GRID_TILES_PER_PLAYER_TRAIN_TILES = 2;

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        global_data.game_scene = this;
        this.game_inited = false;
        this.up_key = undefined;
        this.down_key = undefined;
        this.stopped = false;
        this.game_socket = undefined;
        this.last_server_time = undefined;
        this.player_route = undefined;
        this.routes = {};
    }

    preload() {
        this.load.image('track', 'assets/track.png');
        this.load.image('own_track', 'assets/own_track.png');
        this.load.image('turn', 'assets/turn.png');
        this.load.image('engine', 'assets/engine.png');
        this.load.image('cart', 'assets/cart.png');
        this.load.image('own_turn', 'assets/own_turn.png');
        this.load.audio('bg_music', 'assets/bg_music.mp3');
        this.load.audio("crash","assets/crash.wav")
        this.load.audio("up","assets/up.wav")

    }


    start_music() {
        this.bg_music = this.sound.add('bg_music', { loop: true });
        this.bg_music.play();
        let mute_key = this.input.keyboard.addKey('m');
        mute_key.on('down', function(event) { this.bg_music.mute = !this.bg_music.mute; });
    }

    draw_map() {
        this.cameras.main.setBackgroundColor(0xf7f1da);

        _.values(this.routes).forEach(route => route.draw());
        this.cameras.main.startFollow(this.player_route.train.sprites[0], true);
        this.up_key = this.input.keyboard.addKey('up');
        this.down_key = this.input.keyboard.addKey('down');
    }

    send_start_playing_event() {
        this.game_socket.send_event({type: 'start_playing'});
    }

    client_loaded() {
        this.draw_map();
        this.send_start_playing_event();
        this.game_inited = true;
    }

    create() {
        this.game_socket = new GameSocket();
        this.game_socket.register_event_handler('position', event => this.handle_position_event(event));
        this.game_socket.register_event_handler('win', event => this.handle_win_event(event));
        this.game_socket.register_event_handler('kill', event => this.handle_kill_event(event));
        this.game_socket.register_event_handler('error', event => this.handle_error_event(event));
        this.game_socket.register_event_handler('connection', event => this.handle_connection_event(event));
        this.start_music();
        this.crash = this.sound.add("crash")
        this.up = this.sound.add("up")

    }

    get_speed_message_value(is_speed_up, is_speed_down) {
        return is_speed_up * constants.SPEED_UP_FLAG + is_speed_down * constants.SPEED_DOWN_FLAG;
    }

    update_speed_change() {
        let is_up_pressed = this.input.keyboard.checkDown(this.up_key);
        if (this.player_route.train.is_speed_up != is_up_pressed) {
            this.player_route.train.is_speed_up = is_up_pressed;
            this.game_socket.send_event({type: 'speed_change', value: this.get_speed_message_value(is_up_pressed, this.player_route.train.is_speed_down)});
        }
        let is_down_pressed = this.input.keyboard.checkDown(this.down_key);
        if (this.player_route.train.is_speed_down != is_down_pressed) {
            this.player_route.train.is_speed_down = is_down_pressed;
            this.game_socket.send_event({type: 'speed_change', value: this.get_speed_message_value(this.player_route.train.is_speed_up, is_down_pressed)});
        }
    }

    update_player() {
        this.update_speed_change();
    }

    update_camera() {
        const vertical_tiles = this.player_route.train.length * VERTICAL_GRID_TILES_PER_PLAYER_TRAIN_TILES;
        const wanted_height = vertical_tiles * GRID_PIECE_WIDTH;
        const zoom = Math.min(constants.CANVAS_HEIGHT / wanted_height, 1);
        this.cameras.main.setZoom(zoom);
    }

    update() {
        if (!this.game_inited || this.stopped) {
            return;
        }
        this.update_player();
        _.values(this.routes).forEach(route => route.update());
        this.update_camera();
    }

    handle_connection_event(event) {
        global_data.player_route_id = event.route_id;
        for (const [route_id, route] of Object.entries(event.map)) {
            this.update_server_route(Number(route_id), route, route_id == event.route_id);
        }
        this.player_route = this.routes[event.route_id];
        this.client_loaded();
    };
    
    handle_position_event(event) {
        if (this.stopped) {
            return;
        }
        event.changed_routes.forEach(route => {
            this.update_tracks_from_server(route.route_id, route.tiles);
        });
    
        if (event.server_time < this.last_server_time) {
            /* a newer update has already arrived */
            console.log('got an out-of-order positions update')
            return;
        }
        this.last_server_time = event.server_time;
        for (let route_id in event.locations) {
            let route = this.routes[route_id];
            route.train.update_server_train_state(event.locations[route_id]);
        }
    };
    
    handle_kill_event(event) {
        if (this.stopped) {
            return;
        }
        let kills = event.kills.map(kill => ({
            killed: Number(kill.killed_route_id),
            killer: Number(kill.killer_route_id)
        })); 
    
        let killed = kills.map(kill => kill.killed);
        if (killed.includes(this.player_route.player_id)) {
            /* The client's player was killed */
            if (this.bg_music) {
                this.bg_music.mute = true;
            }
            this.stopped = true;
            this.crash.play()
            global_data.game.scene.start('GameoverScene');
            global_data.game.scene.stop('GameOverlayScene');
            return;
        }
    
        for (let route_id of killed) {
            let route = this.routes[route_id];
            if (!route.is_own) {
                route.remove_train();
            }
        }

        this.up.play()

        event.routes.forEach(route => {
            this.update_tracks_from_server(route.route_id, route.tiles);
        });
    };
    
    handle_win_event(event) {
        if (!this.game_inited) {
            return;
        }
    
        if (this.bg_music) {
            this.bg_music.mute = true;
        }
        global_data.game.scene.start('WinScene');
        global_data.game.scene.stop('GameOverlayScene');
    };
    
    handle_error_event(event) {
        global_data.game.scene.start('ErrorScene', event.message);
        global_data.game.scene.stop('GameOverlayScene');
        global_data.game.scene.stop('GameScene');
    };
    
    update_tracks_from_server(player_id, server_tracks) {
        if (server_tracks.length == 0) {
            if (player_id in this.routes) {
                this.routes[player_id].remove();
                delete this.routes[player_id];
            }
            return;
        }
        if (!(player_id in this.routes)) {
            this.routes[player_id] = new Route(player_id, undefined, false); /* server will not re-build own tracks */
        }
        let route = this.routes[player_id];
        route.remove_tracks();
        route.tracks = server_tracks.map(server_track => Track.from_server_track(server_track, route.is_own));
        route.draw_tracks();
    }
    
    update_server_route(player_id, server_route, is_own) {
        if (!(player_id in this.routes)) {
            let train = new Train(server_route.player, is_own);
            this.routes[player_id] = new Route(player_id, train, is_own);
            train.set_route(this.routes[player_id]);
        }
        let route = this.routes[player_id];
        this.update_tracks_from_server(player_id, server_route.tiles);
        route.train.update_server_train_state(server_route.player);
    }    
}
