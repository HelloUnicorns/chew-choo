const assert  = require('assert');

exports.CANVAS_HEIGHT = 720;
exports.CANVAS_WIDTH = 1280;

exports.NUMBER_OF_ROUTES = 65;

exports.MIN_SPEED = 10;
exports.MAX_SPEED = 30;
exports.ACCELERATION = 5;

exports.DEFAULT_START_ACCELERATION = 0; /* in tiles per second squared */

exports.SPEED_UP_FLAG = 1;
exports.SPEED_DOWN_FLAG = 2;

exports.TRACK_WIDTH = 9;
exports.TRACK_HEIGHT = 9;

assert(exports.TRACK_WIDTH % 3 === 0, "TRACK_WIDTH should be divisible by 3");
assert(exports.TRACK_HEIGHT % 3 === 0, "TRACK_HEIGHT should be divisible by 3");

assert(exports.TRACK_WIDTH > 5, "TRACK_WIDTH should be greater than 5");
assert(exports.TRACK_HEIGHT > 5, "TRACK_HEIGHT should be greater than 5");

exports.START_X = 0;
exports.START_Y = 0;

/* Invincibility */
exports.TRAIN_FULLY_INVISIBLE_TIME = 5; // In seconds
exports.TRAIN_BLINKING_TIME = 3; // In seconds

exports.TRAIN_NOT_INVINCIBLE = 0;
exports.TRAIN_BLINKING = 1;
exports.TRAIN_FULLY_INVISIBLE = 2;
