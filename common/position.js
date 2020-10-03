const constants = require('../common/constants.js');

function calculate_speed_and_position(player, route, new_time) {
    let time_passed_in_seconds = (new_time - player.last_position_update) / 1000;

    let old_speed = player.speed;
    let new_speed = player.speed;
    new_speed += player.is_speed_up ? constants.ACCELERATION * time_passed_in_seconds : 0;
    new_speed -= player.is_speed_down ? constants.ACCELERATION * time_passed_in_seconds : 0;
    new_speed = new_speed > constants.MAX_SPEED ? constants.MAX_SPEED : new_speed;
    new_speed = new_speed < constants.MIN_SPEED ? constants.MIN_SPEED : new_speed;

    acceleration_time = (new_speed - old_speed) / constants.ACCELERATION;
    acceleration_time *= acceleration_time < 0 ? -1: 1;
    average_speed = (old_speed + new_speed) * acceleration_time / time_passed_in_seconds / 2 + 
                    new_speed * (time_passed_in_seconds - acceleration_time) / time_passed_in_seconds;

    player.position_fraction += average_speed * time_passed_in_seconds;
    player.last_position_update = new_time;
    if (player.position_fraction >= 1) {
        position_in_route_change = Math.floor(player.position_fraction);
        player.position_in_route += position_in_route_change;
        player.position_in_route %= route.tiles.length;
        player.position_fraction -= position_in_route_change;
    }

    player.speed = new_speed;
}

exports.calculate_speed_and_position = calculate_speed_and_position;
