const fs = require('fs');
const path = require('path');

// Determine path to the user-provided config file
const configPath = path.join(__dirname, 'config.json');
const exampleConfigPath = path.join(__dirname, 'config.example.json');

let config;
if (fs.existsSync(configPath)) {
  // Load user configuration
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} else {
  // Fall back to example configuration
  console.warn('config.json not found, falling back to config.example.json');
  config = JSON.parse(fs.readFileSync(exampleConfigPath, 'utf8'));
}

module.exports = config;
