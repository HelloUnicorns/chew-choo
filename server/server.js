const express = require('express');
const compression = require('compression');
const { Server } = require('ws');
const { GameManager } = require('./game_manager.js');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const app = express();

app.use(compression())
app.use(express.static('dist'));

const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

const ws_server = new Server({ server });

const game_manger = new GameManager(ws_server);
