const constants = require('../common/constants.js');

function my_mod(num, mod) {
    return (mod + (num % mod)) % mod;
}

function calculate_speed_and_position(train, route, new_time) {
    let time_passed_in_seconds = (new_time - train.last_position_update) / 1000;

    if (time_passed_in_seconds == 0) {
        return;
    }
<<<<<<< HEAD
    if (train.is_stopped) {
        train.last_position_update = new_time;
        return;
    }

=======
        
>>>>>>> route-deletion
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
    let tiles_len = route.tiles.length;
    let position = my_mod(train.position_in_route + train.position_fraction + average_speed * time_passed_in_seconds, tiles_len);
    train.position_in_route = Math.floor(position);
    train.position_fraction = position - train.position_in_route;
    train.speed = new_speed;
}

exports.calculate_speed_and_position = calculate_speed_and_position;
