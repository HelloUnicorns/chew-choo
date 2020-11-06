const _ = require('lodash');
const assert = require('assert');
const constants = require('../common/constants.js');

function my_mod(num, mod) {
    if (mod == Infinity) {
        return num;
    }
    return (mod + (num % mod)) % mod;
}
 
function my_delta_mod(number, mod) {
    if (mod == Infinity) {
        return number;
    }
    return (((number % mod) + mod + mod/2) % mod) - mod/2;
}

function calculate_end_position_when_at_linear_speed(start_position, time_delta, speed) {
    let end_speed = start_position + time_delta * speed;
    assert(_.isFinite(end_speed), 'end speed must be a number');
    return end_speed;
}

function calculate_end_position_and_speed_when_accelerating(latest_speed_update, time_delta, max_speed, acceleration) {
    let acceleration_time_delta = Math.min(time_delta, Math.abs((max_speed - latest_speed_update.update_time_speed) / acceleration));
    let end_speed = latest_speed_update.update_time_speed + acceleration_time_delta * acceleration;
    let acceleration_end_position = latest_speed_update.update_time_position + 
        latest_speed_update.update_time_speed * acceleration_time_delta + acceleration * acceleration_time_delta * acceleration_time_delta / 2;
    let end_position = calculate_end_position_when_at_linear_speed(acceleration_end_position, time_delta - acceleration_time_delta, end_speed);
    assert(_.isFinite(end_speed), 'end speed must be a number');
    assert(_.isFinite(end_position), 'end position must be a number');
    return { end_position, end_speed };
}

function calculate_end_speed_and_position(latest_speed_update, time_delta) {
    switch(latest_speed_update.update_type) {
        case constants.SpeedType.SPEED_CONSTANT:
            return { 
                end_position: calculate_end_position_when_at_linear_speed(latest_speed_update.update_time_position, time_delta / 1000, latest_speed_update.update_time_speed),
                end_speed: latest_speed_update.update_time_speed
            }
        case constants.SpeedType.SPEED_ACCELERATING:
            return calculate_end_position_and_speed_when_accelerating(latest_speed_update, time_delta / 1000, constants.MAX_SPEED, constants.ACCELERATION);
        case constants.SpeedType.SPEED_DECELERATING:
            return calculate_end_position_and_speed_when_accelerating(latest_speed_update, time_delta / 1000, constants.MIN_SPEED, -constants.ACCELERATION);
    }
}

function position_mod(position, tracks_len, leftover_tracks_len) {
    if (leftover_tracks_len) {
        if (Math.floor(position) >= tracks_len + leftover_tracks_len) {
            position = leftover_tracks_len + my_mod(position - leftover_tracks_len, tracks_len);
        }
    } else {
        position = my_mod(position, tracks_len);
    }
    return position;
}

function advance_train(time_delta, latest_speed_update, train_length, tracks, leftover_tracks) {
    assert(time_delta >= 0, "time delta cannot be negative");
    let { end_position, end_speed } = calculate_end_speed_and_position(latest_speed_update, time_delta);
    let int_end_position = Math.floor(end_position);
    let train_start_idx = int_end_position - (train_length - 1);
    let leftover_trailing_tracks = (train_start_idx >= leftover_tracks.length) ? leftover_tracks : leftover_tracks.slice(0, train_start_idx);
    let used_tracks = [];
    for (let i = 0; i < train_length; i++) {
        let track_idx = position_mod(int_end_position - (train_length - 1) + i, tracks.length, leftover_tracks.length);
        let track = track_idx < leftover_tracks.length ? leftover_tracks[track_idx] : tracks[track_idx - leftover_tracks.length];
        assert(track != undefined, "Track can't be undefined");
        used_tracks.push(track);
    }

    return { 
        end_position: position_mod(end_position, tracks.length, leftover_tracks.length), 
        end_speed, used_tracks, leftover_trailing_tracks 
    };
}

exports.advance_train = advance_train;
exports.my_delta_mod = my_delta_mod;
exports.position_mod = position_mod;
