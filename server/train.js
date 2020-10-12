
const { performance } = require('perf_hooks');

const constants = require('../common/constants.js');
const { calculate_speed_and_position, set_train_position } = require('../common/position.js');

class Train {
    constructor(id) {
        this.id = id;
        this.position_in_route = 0;
        this.position_fraction = 0;
        this.last_position_update = Train.time;
        this.is_in_leftover = false;
        this.length = 3;
        this.speed = constants.MIN_SPEED; /* in tiles per second */
        this.is_speed_up = false;
        this.is_speed_down = false;
        this.is_stopped = false;
        this.invincibility_state = constants.TRAIN_NOT_INVINCIBLE;
        this.kill_notified = false;
        this.is_bot = true;
        this.acceleration = constants.DEFAULT_START_ACCELERATION; /* Isn't passed to the client; but required for calculate_speed_and_position */

        this.invincibility_timeout = undefined;

        this.active = true;
    }

    #invinciblize = () => {
        clearTimeout(this.invincibility_timeout);

        this.invincibility_state = constants.TRAIN_FULLY_INVISIBLE_TIME;
        /* Start fully invisible timer */
        this.invincibility_timeout = setTimeout(
            () => {
                this.invincibility_state = constants.TRAIN_BLINKING;
                /* Start blinking timer */
                this.invincibility_timeout = setTimeout(
                    () => {
                        /* Train is not invincible anymore */
                        this.invincibility_state = constants.TRAIN_NOT_INVINCIBLE;
                    }, constants.TRAIN_BLINKING_TIME * 1000);
            }, constants.TRAIN_FULLY_INVISIBLE_TIME * 1000);
    }

    #vinciblize = () => {
        clearTimeout(this.invincibility_timeout);
        this.invincibility_state = constants.TRAIN_NOT_INVINCIBLE
    }

    allocate() {
        this.is_bot = false;
        this.#invinciblize();
    }

    free() {
        this.#vinciblize();
    }

    collisionable() {
        return this.active && this.invincibility_state == constants.TRAIN_NOT_INVINCIBLE;
    }

    /* Periodic updates */
    update(rail) {
        let length = this.is_in_leftover ? Infinity : rail.length();
        calculate_speed_and_position(this, length, Train.time);

        if (this.is_in_leftover) {
            if (this.position_in_route >= rail.leftover_length()) {
                /* Train has just left the leftover */
                set_train_position(this, this.position_in_route - rail.leftover_length(), rail.length());
                rail.clear_leftover();
                train.is_in_leftover = false;
                return true;
            }
        }

        return false;
    }

    static update_time() {
        Train.time = performance.now();
    }

    static bot_position(all_trains) {
        let bot = all_trains.find((train) => train.is_bot && train.active);
        if (bot) {
            return {
                position_in_route: bot.position_in_route,
                position_fraction: bot.position_fraction
            };
        }

        return {position_fraction: 0, position_fraction: 0};
    }
}

exports.Train = Train;