const fs = require('fs');
const path = require('path');
const { parse } = require('comment-json');
const deepmerge = require('deepmerge');
const glob = require('glob');

/**
 * Reads the config file from disk.
 * @returns {Record<string, any>} The config JSON.
 */
function readConfig(suffix) {
  const directory = path.join(__dirname, suffix ? `./appsettings.${suffix}` : './appsettings');
  const fileJson = directory + '.json';
  const fileJsonc = directory + '.json';
  let files = glob.sync(path.join(directory, '**/*.{json,jsonc}'));
  if (fs.existsSync(fileJson)) {
    files = [fileJson, ...files];
  }
  if (fs.existsSync(fileJsonc)) {
    files = [fileJsonc, ...files];
  }
  let values = {};
  for (const file of files) {
    logger.debug('Reading config file', file);
    const data = fs.readFileSync(file);
    const str = data.toString();
    const cfg = parse(str);
    values = deepmerge(values, cfg);
  }
  return values;
}

/**
 * The current config values.
 */
let config = {};
let logger;

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
function get(path, def = undefined, cfg = config) {
  const els = path.split(':');
  let current = cfg;
  for (let i = 0; i < els.length; i++) {
    current = current[els[i]];
    if (current === undefined) {
      if (def === Error) {
        logger.debug('Missing configuration option at ' + path);
        throw new Error('Missing configuration option at ' + path);
      }
      return def;
    }
  }
  return current;
} 

get.load = function load(log, env = 'production') {
  logger = log;
  logger.info('Loading root config files');
  let values = readConfig();

  if (env) {
    logger.info('Loading environment config files', env);
    const envConfig = readConfig(env);
    values = deepmerge(values, envConfig);
  }
  config = values;
  logger.info('Loaded', count(config), 'config options');
  return values;
}

function count(obj) {
  if (obj === null || obj === undefined) {
    return 0;
  }
  if (Array.isArray(obj)) {
    return obj.reduce((c, v) => c + count(v), 0);
  }
  if (typeof obj === 'object' && obj) {
    let c = 0;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        c += count(value)
      }
    }
    return c;
  }
  return 1;
}

module.exports = get;
