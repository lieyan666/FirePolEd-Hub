const assert = require('node:assert');
const pkg = require('../package.json');
assert.strictEqual(pkg.name, 'firepoled-hub');
console.log('basic test passed');
