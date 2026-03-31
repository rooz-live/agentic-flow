const { existsSync } = require('fs');
const { join } = require('path');

const bindings = existsSync(join(__dirname, 'index.node'))
  ? require('./index.node')
  : require('./target/release/libevidence_validator.node');

module.exports = bindings;
