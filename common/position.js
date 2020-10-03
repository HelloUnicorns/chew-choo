function calculate_position(player, route, new_time) {
    player.position_fraction += player.speed * (new_time - player.last_position_update) / 1000;
    player.last_position_update = new_time;
    if (player.position_fraction >= 1) {
        position_in_route_change = Math.floor(player.position_fraction);
        player.position_in_route += position_in_route_change;
        player.position_in_route %= route.tiles.length;
        player.position_fraction -= position_in_route_change;
    }
}

exports.calculate_position = calculate_position;