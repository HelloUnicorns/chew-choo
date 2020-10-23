const { direction_to_direction_components, direction_from_direction_components } = require('../common/utils.js');
const flatten = (crossings) => Object.values(crossings).flatMap(Object.values);

function find_crossings(rails_array) {
    crossings = [];
    let rail_0_tracks = rails_array[0].all_tracks;
    let rail_1_tracks = rails_array[1].all_tracks;
    for (let track_0_idx = 0; track_0_idx < rail_0_tracks.length; track_0_idx++) {
        for (let track_1_idx = 0; track_1_idx < rail_1_tracks.length; track_1_idx++) {
            if (rail_0_tracks[track_0_idx].x == rail_1_tracks[track_1_idx].x &&
                rail_0_tracks[track_0_idx].y == rail_1_tracks[track_1_idx].y) {
                crossings.push({
                    track_indices: [track_0_idx, track_1_idx],
                    x: rail_0_tracks[track_0_idx].x,
                    y: rail_0_tracks[track_0_idx].y})
            }
        }    
    }
    return crossings;
}

function find_crossing_by_track(crossings, track) {
    for (const crossing of crossings) {
        if (crossing.x == track.x && crossing.y == track.y) {
            return crossing;
        }
    }
}

function walk_tracks_to_next_crossing(rail, start_track_index, crossings) {
    let cur_index = start_track_index;
    let crossing = undefined;
    let path = [];
    let track = rail.track_by_position(cur_index);
    do {
        path.push(track);
        cur_index++;
        track = rail.track_by_position(cur_index);
        crossing = find_crossing_by_track(crossings, track);
    } while (!crossing);
    return { path, crossing, crossing_track: track };
}

function find_top_left_track_index(tracks) {
    let top_left_track_index = 0;
    for (let track_index = 0; track_index < tracks.length; track_index++) {
        if ((tracks[track_index].x < tracks[top_left_track_index].x) || 
            (tracks[track_index].x == tracks[top_left_track_index].x && tracks[track_index].y <= tracks[top_left_track_index].y)) {
                top_left_track_index = track_index;
        }
    }
    return top_left_track_index;
}

function find_external_crossing(crossings, rails_arrays) {
    let external_tracks_indices = rails_arrays.map(rail => rail.all_tracks).map(find_top_left_track_index);
    let external_tracks = rails_arrays.map((rail, idx) => rail.all_tracks[external_tracks_indices[idx]]);
    let top_left_track_index = find_top_left_track_index(external_tracks);
    return {
        first_external_crossing: 
            walk_tracks_to_next_crossing(rails_arrays[top_left_track_index],
                                        external_tracks_indices[top_left_track_index],
                                        crossings).crossing, 
        rails_array_index: top_left_track_index 
    }
}

function get_crossings_update(new_tracks, controller_rail, controllee_rail) {
    let updated_crossings = {};
    let updated_dead_crossings = [];

    let controller_old_crossings = controller_rail.crossings;
    let controllee_old_crossings = controllee_rail.crossings;

    /* Iterate over tracks and and find the crossings of the new path */
    new_tracks.forEach((track) => {
        if (controller_rail.has_crossing(track.x, track.y) ^ controllee_rail.has_crossing(track.x, track.y)) {
            /*  If only one of the rails has a crossing in this position, add it to the crossings dict.
                Otherwise, it either:
                A. Does not exist
                B. Is a shared crossing between the controller and the controllee, hence it should
                   not exist anymore and will be added later on to the dead crossings list. */
            let _c = (
                (controller_rail.crossings[track.x] && controller_rail.crossings[track.x][track.y]) 
                || (controllee_rail.crossings[track.x] && controllee_rail.crossings[track.x][track.y])
            );

            if (_c) {
                updated_crossings[_c.x] = updated_crossings[_c.x] || {};
                updated_crossings[_c.x][_c.y] = _c;
            }
        }
    });

    /* Iterate over the old crossings and detect dead ones */
    
    for (const crossing of flatten(controller_old_crossings).concat(flatten(controllee_old_crossings))) {
        /* If it has not been added to the updated crossings dict, it no longer exists */
        if (!updated_crossings[crossing.x] || !updated_crossings[crossing.x][crossing.y]) {
            updated_dead_crossings.push(crossing);
        }
    }

    return {crossings: updated_crossings, dead_crossings: updated_dead_crossings};
}

function union_tracks(controller_rail, controllee_rail, controller_position, controller_length) {
    let rails_arrays = [controller_rail, controllee_rail];

    /* First of all, let's find all crossings */
    let crossings = find_crossings(rails_arrays);

    /* Then, we find the first external one */
    const { first_external_crossing, rails_array_index } = find_external_crossing(crossings, rails_arrays);

    let current_crossing = first_external_crossing;
    let current_rails_array_index = rails_array_index;
    let external_crossings = [];
    let controller_track = controller_rail.track_by_position(controller_position);
    let closest_external_crossing = undefined;
    let new_tracks_parts = []; 
    let new_tracks = []; 
    let leftover_tracks = [];

    do {
        current_rails_array_index = 1 - current_rails_array_index;
        external_crossings.push(current_crossing);
        const { crossing, path } = walk_tracks_to_next_crossing(
            rails_arrays[current_rails_array_index],
            current_crossing.track_indices[current_rails_array_index],
            crossings);

        /* Update orientation of first track */
        const { from: end_of_previous_direction_from } = direction_to_direction_components(
            rails_arrays[1 - current_rails_array_index].track_by_position(current_crossing.track_indices[1 - current_rails_array_index]).direction);
        const { to: first_direction_to } = direction_to_direction_components(path[0].direction);
        path[0].direction = direction_from_direction_components(end_of_previous_direction_from, first_direction_to);
        
        current_crossing = crossing;
        new_tracks_parts.push(path);
        if (crossing.x == controller_track.x && crossing.y == controller_track.y) {
            closest_external_crossing = crossing;
        }
    } while (current_crossing != first_external_crossing);
    

    if (!closest_external_crossing) {
        const { crossing, path } = walk_tracks_to_next_crossing(controller_rail, controller_position, external_crossings);
        closest_external_crossing = crossing;
        leftover_tracks = path;
    }

    /* add train carts except engine into leftover */
    for (let i = 0; i < controller_length - 1; i++) {
        leftover_tracks.unshift(controller_rail.track_by_position(controller_position - i - 1));
    }

    /* we always want the first track in the tracks to be the track the player is at */
    let closest_crossing_index = external_crossings.indexOf(closest_external_crossing);
    for (let i = 0; i < new_tracks_parts.length; i++) {
        new_tracks = new_tracks.concat(new_tracks_parts[(i + closest_crossing_index) % new_tracks_parts.length]);
    }
    

    let updated_crossings = get_crossings_update(new_tracks.concat(leftover_tracks), controller_rail, controllee_rail);

    return {
        tracks: new_tracks,
        leftover_tracks,
        crossings: updated_crossings.crossings,
        dead_crossings: updated_crossings.dead_crossings,
        position: (controller_length - 1) + (controller_position % 1)
    };
}

exports.union_tracks = union_tracks;
exports.flatten = flatten;