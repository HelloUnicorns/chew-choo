const constants = require('../common/constants.js');

const { get_active_clients } = require('./server.js');
const { Train } = require('./train.js');

/* Player handlers */
class Player {
    constructor (client, train) {
        this.train = train;
        this.client = client;
        this.#register_start_playing_event_timeout();
    }

    #remove_start_playing_timeout = () => {
        clearTimeout(this.start_playing_event_timeout);
        this.start_playing_event_timeout = undefined;
    }

    #register_start_playing_event_timeout = () => {
        this.start_playing_event_timeout = setTimeout(() => {
            console.log(`Client ${this.client.id} did not send start game event - got removed`);
            this.leave();
        }, constants.START_PLAYING_EVENT_TIMEOUT_MS);
    }

    #event_handlers = {
        start_playing : () => {
            this.#remove_start_playing_timeout();
            this.train.is_stopped = false;
            return true;
        },

        speed_change : (event) => {
            this.train.is_speed_up = event.value & constants.SPEED_UP_FLAG;
            this.train.is_speed_down = event.value & constants.SPEED_DOWN_FLAG;
            return true;
        }
    }

    leave() {
        this.client.removed = true;
        this.train.abandoned = true;
        this.client.close();
    }

    has_event(type) {
        return type in this.#event_handlers;
    }

    handle_event(type, message) {
        if (this.has_event(type)) {
            return this.#event_handlers[type](message);
        }
        return false;
    }

    get_position_update() {
        let neighbor_ids = this.train.rail.get_neighbor_ids(2); // first and second degree neighbors
        let neighbor_entries = Object.entries(Train.state).filter(([train_id, item]) => neighbor_ids.includes(Train.get(train_id).rail.id));
        return neighbor_entries.reduce((result, [train_id, item]) => (result[train_id] = item.train_attributes, result), {});
    }

    static get all() {
        return get_active_clients().map(client => client.player);
    }

    static get(client_id) {
        let player = Player.all.filter((player) => player.client.id == client_id);
        return player[0];
    }

    static get winner() {
        let alive = Object.values(Train.all).filter(train => train.active).map(train => Player.get(train.id));
        if (alive.length >= 2) {
            return undefined;
        }
        return alive[0];
    }
}

exports.Player = Player;