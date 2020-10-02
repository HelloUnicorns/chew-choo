const express = require('express');
const { Server } = require('ws');
const { run_game } = require('./game.js');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const app = express()

app.use(express.static('client'));

const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

run_game(wss);