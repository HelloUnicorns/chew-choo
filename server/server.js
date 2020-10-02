const express = require('express');
const compression = require('compression');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const app = express();


app.use(express.static('dist'));
app.use(compression());
const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

exports.wss = wss;