const constants = require('../common/constants.js');

function my_mod(num, mod) {
    return (mod + (num % mod)) % mod;
}

function set_train_position(train, position, route_len) {
    let mod_position = my_mod(position, route_len);
    train.position_in_route = Math.floor(mod_position);
    train.position_fraction = mod_position - train.position_in_route;
}
function calculate_speed_and_position(train, route_len, new_time) {
    let time_passed_in_seconds = (new_time - train.last_position_update) / 1000;

    if (time_passed_in_seconds == 0) {
        return;
    }
    if (train.is_stopped) {
        train.last_position_update = new_time;
        return;
    }

    train.speed += train.acceleration * time_passed_in_seconds;
    let old_speed = train.speed;
    let new_speed = train.speed;
    new_speed += train.is_speed_up ? constants.ACCELERATION * time_passed_in_seconds : 0;
    new_speed -= train.is_speed_down ? constants.ACCELERATION * time_passed_in_seconds : 0;
    new_speed = new_speed > constants.MAX_SPEED ? constants.MAX_SPEED : new_speed;
    new_speed = new_speed < constants.MIN_SPEED ? constants.MIN_SPEED : new_speed;

    acceleration_time = (new_speed - old_speed) / constants.ACCELERATION;
    acceleration_time *= acceleration_time < 0 ? -1: 1;
    average_speed = (old_speed + new_speed) * acceleration_time / time_passed_in_seconds / 2 + 
    new_speed * (time_passed_in_seconds - acceleration_time) / time_passed_in_seconds;
    train.last_position_update = new_time;
    set_train_position(train, train.position_in_route + train.position_fraction + average_speed * time_passed_in_seconds, route_len);

    train.speed = new_speed;
}

exports.calculate_speed_and_position = calculate_speed_and_position;
exports.set_train_position = set_train_position;
