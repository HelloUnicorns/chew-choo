const _ = require('lodash');
const constants = require('../common/constants.js');
const { Route } = require('./route.js');
const { GameSocket } = require('./game_socket.js');
const { GRID_PIECE_WIDTH } = require('./grid.js');

const VERTICAL_GRID_TILES_PER_PLAYER_TRAIN_TILES = 2;

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.game_inited = false;
        this.space_key = undefined;
        this.is_space_pressed = false;
        this.stopped = false;
        this.game_socket = undefined;
        this.player_route = undefined;
        this.routes = {};
        this.postponed_events = [];
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
        this.space_key = this.input.keyboard.addKey('space');
    }

    client_loaded() {
        this.game_socket.send_message('start_playing');
        this.game_inited = true;
        this.draw_map();
    }

    create() {
        this.scene.launch('GameOverlayScene', this);
        this.game_socket = new GameSocket(this);
        this.start_music();
        this.crash = this.sound.add("crash")
        this.up = this.sound.add("up")
    }

    get_speed_message_value(is_speed_up, is_speed_down) {
        return is_speed_up * constants.SPEED_UP_FLAG + is_speed_down * constants.SPEED_DOWN_FLAG;
    }

    update_speed_change() {
        let is_space_pressed = this.input.keyboard.checkDown(this.space_key);
        if (this.is_space_pressed != is_space_pressed) {
            this.game_socket.send_message('speed_change', { 
                type: is_space_pressed ? constants.SpeedType.SPEED_ACCELERATING : constants.SpeedType.SPEED_DECELERATING
            });
            this.is_space_pressed = is_space_pressed;
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
        let server_time = performance.now() + this.server_time_delta;
        this.update_player();
        _.values(this.routes).forEach(route => route.update(server_time));
        this.update_camera();
    }

    remove_route(route_id) {
        if (route_id == this.player_route.route_id) {
            /* The client's player was killed */
            if (this.bg_music) {
                this.bg_music.mute = true;
            }
            this.stopped = true;
            this.crash.play()
            this.game.scene.start('GameoverScene');
            return true;
        }

        if (route_id in this.routes) {
            this.routes[route_id].remove();
            delete this.routes[route_id];
        }
        this.up.play();
    }

    handle_new_route(server_time, new_route) {
        this.routes[new_route.id] = new Route(this, server_time, new_route, new_route.id == this.player_route_id);
    }

    #server_event_handlers = {
        new_route: (server_time, server_event) => { 
            this.handle_new_route(server_time, server_event.route);
        },
        route_update: (server_time, server_event) => {
            this.routes[server_event.id].update_route(server_event.tracks, server_event.latest_speed_update);
        },
        route_removed: (server_time, server_event) => {
            this.remove_route(server_event.id);
        },
        invincibility_change: (server_time, server_event) => {
            this.routes[server_event.id].train.update_invincibility(server_event.new_invincibility_state);
        },
        speed: (server_time, server_event) => {
            this.routes[server_event.id].update_latest_speed_update(server_event.update);
        }
    }

    handle_server_event(server_time, server_event) {
        this.#server_event_handlers[server_event.type](server_time, server_event[server_event.type]);
    }

    handle_server_message(message_type, message) {
        this.#server_message_handlers[message_type](message);
    }

    #server_message_handlers = {
        connection: (message) => {
            this.player_route_id = message.route_id;
            for (const route of message.routes) {
                this.handle_new_route(message.server_time, route);
            }
            this.player_route = this.routes[this.player_route_id];
            this.postponed_events.filter(postponed_event => postponed_event.server_time >= message.server_time)
                .forEach(postponed_event => this.handle_server_event(postponed_event.server_time, postponed_event.event));
            this.postponed_events = [];
            this.server_time_delta = message.server_time - performance.now();
            this.client_loaded();
        },
        update: (message) => {
            if (this.stopped) {
                return;
            }
            if (!this.player_route_id) {
                this.postponed_events.push(message.events.map(event => ({ event, server_time: message.server_time})));
                return;
            }
            this.server_time_delta = message.server_time - performance.now();
            for (const event of message.events) {
                this.handle_server_event(message.server_time, event);
                if (this.stopped) {
                    /* there could be a message that killed the player */
                    return;
                }
            }
        },
        win: (message) => {
            if (!this.game_inited) {
                return;
            }
        
            if (this.bg_music) {
                this.bg_music.mute = true;
            }
            this.game.scene.start('WinScene');
        },
        error: (message) => {
            this.game.scene.start('ErrorScene', event.message);
        },
    }
    
}
