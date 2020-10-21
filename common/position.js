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

function calculate_end_position_when_at_linear_speed(start_position, time_delta, speed, route_len) {
    let end_speed = my_mod(start_position + time_delta * speed, route_len);
    assert(_.isFinite(end_speed), 'end speed must be a number');
    return end_speed;
}

function calculate_end_position_and_speed_when_accelerating(latest_speed_update, time_delta, max_speed, acceleration, route_len) {
    let acceleration_time_delta = Math.min(time_delta, Math.abs((max_speed - latest_speed_update.update_time_speed) / acceleration));
    let end_speed = latest_speed_update.update_time_speed + acceleration_time_delta * acceleration;
    let acceleration_end_position = my_mod(latest_speed_update.update_time_position + 
        latest_speed_update.update_time_speed * acceleration_time_delta + acceleration * acceleration_time_delta * acceleration_time_delta / 2,
        route_len);
    let end_position = calculate_end_position_when_at_linear_speed(acceleration_end_position, time_delta - acceleration_time_delta, end_speed, route_len);
    assert(_.isFinite(end_speed), 'end speed must be a number');
    assert(_.isFinite(end_position), 'end position must be a number');
    return { end_position, end_speed };
}

function calculate_end_speed_and_position(latest_speed_update, time_delta, route_len) {
    switch(latest_speed_update.update_type) {
        case constants.SpeedType.SPEED_CONSTANT:
            return { 
                end_position: calculate_end_position_when_at_linear_speed(latest_speed_update.update_time_position, time_delta / 1000, latest_speed_update.update_time_speed, route_len),
                end_speed: latest_speed_update.update_time_speed
            }
        case constants.SpeedType.SPEED_ACCELERATING:
            return calculate_end_position_and_speed_when_accelerating(latest_speed_update, time_delta / 1000, constants.MAX_SPEED, constants.ACCELERATION, route_len);
        case constants.SpeedType.SPEED_DECELERATING:
            return calculate_end_position_and_speed_when_accelerating(latest_speed_update, time_delta / 1000, constants.MIN_SPEED, -constants.ACCELERATION, route_len);
    }
}

exports.calculate_end_speed_and_position = calculate_end_speed_and_position;
exports.my_delta_mod = my_delta_mod;
