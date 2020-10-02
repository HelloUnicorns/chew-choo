const path = require('path');

module.exports = {
  entry: './client/main.js',
  output: {
    path: path.resolve('./dist'),
    filename: 'bundle.js'
  }
};