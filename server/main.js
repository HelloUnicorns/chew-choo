const express = require('express');
const { run_game } = require('./game.js');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const app = express()

app.use(express.static('dist'));

const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

run_game(wss);