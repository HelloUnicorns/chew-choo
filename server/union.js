const flatten = (crossings) => Object.values(crossings).flatMap(Object.values);

function find_crossings(tracks_array) {
    crossings = [];
    for (let track_0_idx = 0; track_0_idx < tracks_array[0].length; track_0_idx++) {
        for (let track_1_idx = 0; track_1_idx < tracks_array[1].length; track_1_idx++) {
            if (tracks_array[0][track_0_idx].x == tracks_array[1][track_1_idx].x &&
                tracks_array[0][track_0_idx].y == tracks_array[1][track_1_idx].y) {
                crossings.push({
                    track_indices: [track_0_idx, track_1_idx],
                    x: tracks_array[0][track_0_idx].x,
                    y: tracks_array[0][track_0_idx].y})
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

function get_next_track_index(tracks, track_index) {
    return (track_index + 1) % tracks.length;
}

function walk_tracks_to_next_crossing(tracks, start_track_index, crossings) {
    let cur_index = start_track_index;
    let crossing = undefined;
    let path = [];

    do {
        path.push(tracks[cur_index]);
        cur_index = get_next_track_index(tracks, cur_index);
        crossing = find_crossing_by_track(crossings, tracks[cur_index]);
    } while (!crossing);
    return { path, crossing, crossing_track: tracks[cur_index] };
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

function find_external_crossing(crossings, tracks_arrays) {
    let external_tracks_indices = tracks_arrays.map(find_top_left_track_index);
    let external_tracks = tracks_arrays.map((tracks, idx) => tracks[external_tracks_indices[idx]]);
    let top_left_track_index = find_top_left_track_index(external_tracks);
    return { 
        first_external_crossing: 
            walk_tracks_to_next_crossing(tracks_arrays[top_left_track_index],
                                        external_tracks_indices[top_left_track_index],
                                        crossings).crossing, 
        tracks_array_index: top_left_track_index 
    }
}

function get_crossings_update(new_tracks, controller, controllee) {
    let updated_crossings = {};
    let updated_dead_crossings = [];

    let controller_old_crossings = controller.crossings;
    let controllee_old_crossings = controllee.crossings;

    /* Iterate over tracks and and find the crossings of the new path */
    new_tracks.forEach((track) => {
        if (controller.has_crossing(track.x, track.y) ^ controllee.has_crossing(track.x, track.y)) {
            /*  If only one of the rails has a crossing in this position, add it to the crossings dict.
                Otherwise, it either:
                A. Does not exist
                B. Is a shared crossing between the controller and the controllee, hence it should
                   not exist anymore and will be added later on to the dead crossings list. */
            let _c = (
                (controller.crossings[track.x] && controller.crossings[track.x][track.y]) 
                || (controllee.crossings[track.x] && controllee.crossings[track.x][track.y])
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

function union_tracks(controller, controllee, controller_position) {
    let controller_tracks = controller.tracks;
    let controllee_tracks = controllee.tracks;
    let tracks_arrays = [controller_tracks, controllee_tracks];

    /* First of all, let's find all crossings */
    let crossings = find_crossings(tracks_arrays);

    /* Then, we find the first external one */
    const { first_external_crossing, tracks_array_index } = find_external_crossing(crossings, tracks_arrays);

    let current_crossing = first_external_crossing;
    let current_tracks_array_index = tracks_array_index;
    let external_crossings = [];
    let controller_track = controller_tracks[controller_position];
    let closest_external_crossing = undefined;
    let new_tracks_parts = []; 
    let new_tracks = []; 
    let leftover_tracks = [];

    do {
        current_tracks_array_index = 1 - current_tracks_array_index;
        external_crossings.push(current_crossing);
        const { crossing, path } = walk_tracks_to_next_crossing(
            tracks_arrays[current_tracks_array_index],
            current_crossing.track_indices[current_tracks_array_index],
            crossings);

        /* Update orientation of first track */
        path[0].direction_from = tracks_arrays[1 - current_tracks_array_index][current_crossing.track_indices[1 - current_tracks_array_index]].direction_from;
        
        current_crossing = crossing;
        new_tracks_parts.push(path);
        if (crossing.x == controller_track.x && crossing.y == controller_track.y) {
            closest_external_crossing = crossing;
        }
    } while (current_crossing != first_external_crossing);
    

    if (!closest_external_crossing) {
        const { crossing, path, crossing_track } = walk_tracks_to_next_crossing(controller_tracks, controller_position, external_crossings);
        closest_external_crossing = crossing;
        /* add the last track - it would be twice, both in the leftover and in the position in tracks */
        path.push(crossing_track);
        leftover_tracks = path;
    }

    /* we always want the first track in the tracks to be the track the player is at */
    let closest_crossing_index = external_crossings.indexOf(closest_external_crossing);
    for (let i = 0; i < new_tracks_parts.length; i++) {
        new_tracks = new_tracks.concat(new_tracks_parts[(i + closest_crossing_index) % new_tracks_parts.length]);
    }
    

    let updated_crossings = get_crossings_update(new_tracks, controller, controllee);

    return {
        tracks: new_tracks,
        leftover_tracks,
        crossings: updated_crossings.crossings,
        dead_crossings: updated_crossings.dead_crossings,
        position: 0
    };
}

exports.union_tracks = union_tracks;
exports.flatten = flatten;