const constants = require('../common/constants.js');
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
            this.client.leave();
        }, constants.START_PLAYING_EVENT_TIMEOUT_MS);
    }

    #message_handlers = {
        start_playing : () => {
            this.#remove_start_playing_timeout();
            this.train.is_stopped = false;
        },

        speed_change : (event) => {
            /* TODO: add code to avoid too many speed changes for the same player */
            this.train.change_speed(!!(event.value & constants.SPEED_UP_FLAG), !!(event.value & constants.SPEED_DOWN_FLAG));
        }
    }

    leave() {
        this.train.abandoned = true;
    }

    handle_message(type, message) {
        if (type in this.#message_handlers) {
            this.#message_handlers[type](message);
        }
    }

    get id() {
        return this.train.id;
    }
}

exports.Player = Player;