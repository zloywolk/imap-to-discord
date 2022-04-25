import fs from 'fs';
import path from 'path';
import { parse } from 'comment-json';
import deepmerge from 'deepmerge';
import glob from 'glob';
import Logger from './log';

/**
 * Reads the config file from disk.
 * @returns The config JSON.
 */
function readConfig(suffix?: string) {
  const directory = path.join(__dirname, suffix ? `../appsettings.${suffix}` : '../appsettings');
  logger.debug('Using config directory', directory);
  const fileJson = directory + '.json';
  const fileJsonc = directory + '.json';
  let files = glob.sync(path.join(directory, '**/*.{json,jsonc,json5}'));
  if (fs.existsSync(fileJson)) {
    files = [fileJson, ...files];
  }
  if (fs.existsSync(fileJsonc)) {
    files = [fileJsonc, ...files];
  }
  let values: Record<string, any> = {};
  for (const file of files) {
    logger.debug('Reading config file', file);
    const data = fs.readFileSync(file);
    const str = data.toString();
    const cfg = parse(str) as Record<string, any>;
    values = deepmerge(values, cfg);
  }
  return values;
}

/**
 * The current config values.
 */
let config: Record<string, any> = {};
let logger: Logger;

/**
 * Gets the config value at the given path.
 * @param path The path.
 * @param def The default value (pass `Error` to raise if missing).
 * @param def The config.
 * @returns The config value.
 * @example
 * get('MigratorSettings:TestSetting')
 * get('MigratorSettings:MissingTestSetting', 'My default value')
 */
export default function get<T = any>(path: string, def: any = undefined, cfg = config): T {
  const els = path.split(':');
  let current: any = cfg;
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

/**
 * Loads the config.
 * @param log The logger.
 * @param env The current environment.
 * @returns The config values
 */
export function loadConfig(log: Logger, env = 'production') {
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

function count(obj: any): number {
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
