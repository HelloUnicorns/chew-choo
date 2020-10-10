exports.CANVAS_HEIGHT = 720;
exports.CANVAS_WIDTH = 1280;

exports.MIN_SPEED = 10;
exports.MAX_SPEED = 30;
exports.ACCELERATION = 5;

exports.DEFAULT_START_ACCELERATION = 0; /* in tiles per second squared */

exports.SPEED_UP_FLAG = 1;
exports.SPEED_DOWN_FLAG = 2;

exports.TRACK_WIDTH = 9;
exports.TRACK_HEIGHT = 9;

exports.START_X = 0;
exports.START_Y = 0;

/* Invincibility */
exports.PLAYER_FULLY_INVISIBLE_TIME_MS = 5 * 1000;
exports.PLAYER_BLINKING_TIME_MS = 3 * 1000;
exports.START_PLAYING_EVENT_TIMEOUT_MS = 60 * 1000;

exports.PLAYER_NOT_INVINCIBLE = 0;
exports.PLAYER_BLINKING = 1;
exports.PLAYER_FULLY_INVISIBLE = 2;

exports.HOW_TO=`Chew Choo! is a multiplayer/singleplayer web-game where the player controls a train on a cyclic route.  
The routes of trains of different players cross each other,  
and the goal of the game is to be the last one standing by running over other trains.  
The player's route will expand and merge with the routes of the trains it runs over.

CONTROLS:
Press up arrow key to speed up.  
Press down arrow key to slow down.  
Press m to toggle music.`