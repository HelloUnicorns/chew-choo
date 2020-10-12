const { get_active_clients } = require('./server.js');

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

    static get(route_id) {
        let client = get_active_clients((client) => client.player.route_id == route_id);
        return client.length == 0 ? undefined : client[0].player;
    }

    /* Events */
    start_playing() {
        this.remove_start_playing_timeout();
        map.start_playing(this.route_id);
    }

    update_speed_change(event) {
        map.update_speed_change(this.route_id, event.value);
    }
}

exports.Player = Player;