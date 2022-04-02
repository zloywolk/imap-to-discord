const fs = require('fs');
const path = require('path');
const { parse } = require('comment-json');
const deepmerge = require('deepmerge');

/**
 * Reads the config file from disk.
 * @returns {Record<string, any>} The config JSON.
 */
function readConfig(suffix) {
  const file = path.join(__dirname, suffix ? `./appsettings.${suffix}.json` : './appsettings.json');
  const data = fs.readFileSync(file);
  const str = data.toString();
  return parse(str);
}

/**
 * The current config values.
 */
let config = readConfig();

const env = process.env.NODE_ENV;
if (env) {
  const envConfig = readConfig(env);
  config = deepmerge(config, envConfig);
}

/**
 * Gets the config value at the given path.
 * @param {string} path The path.
 * @param {any} def The default value (pass `Error` to raise if missing).
 * @param {cfg} def The config.
 * @returns {any} The config value.
 * @example
 * get('MigratorSettings:TestSetting')
 * get('MigratorSettings:MissingTestSetting', 'My default value')
 */
module.exports = function get(path, def = undefined, cfg = config) {
  const els = path.split(':');
  let current = cfg;
  for (let i = 0; i < els.length; i++) {
    current = current[els[i]];
    if (current === undefined) {
      if (def === Error) {
        throw new Error('Missing configuration option at ' + path);
      }
      return def;
    }
  }
  return current;
}
