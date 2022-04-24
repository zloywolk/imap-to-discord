import 'isomorphic-fetch';
import config from './config';
import chalk from 'chalk';
import Logger from './log';
import Forward from './forward';
import { KVP } from './types';
import createSource from './source';
import Thing from './thing/thing';

const rootLogger = new Logger([
  () => `[${new Date().toISOString()}]`,
]);

const env =  process.env.NODE_ENV || 'none';
rootLogger.info('Environment is', env);

config.load(rootLogger.fork([chalk.red('[config]')]), env);

const spourceLogger = rootLogger.fork([chalk.cyan('[source]')]);
spourceLogger.info('Creating all sources');
Object
  .entries(config('Sources', Error))
  .sort(sortEntriesAlphabetically)
  .forEach(async ([name, options]) => {
    try {
      const source = createSource(spourceLogger.fork([`[${name}]`]), name, options)
      spourceLogger.debug('Starting source', source.name);
      await source.init();
      spourceLogger.debug('Started source', source.name);
      spourceLogger.debug('Adding event listeners to source', source.name);
      source.addListener('message', async (thing: Thing) => {
        thing = thing
          .append('source', source.name)
          .append('source-thing', source.getThing());
        spourceLogger.info('Message from ' + name);
        for (const forward of forwards) {
          const done = await forward.forward(thing);
          if (done) {
            spourceLogger.debug(forward.name + ' marked the message handling as done');
            return;
          }
        }
      });
    } catch(error) {
      spourceLogger.error('Failed to start source', name, error);
      process.exit(1);
    }
  });

const forwardLogger = rootLogger.fork([chalk.yellow('[forward]')]);
forwardLogger.info('Creating all forwarders');
const forwards = Object
  .entries(config('Forward', Error))
  .sort(sortEntriesAlphabetically)
  .map(([name, options]) => new Forward(forwardLogger, name, options));
forwards
  .forEach(async forward => {
    try {
      spourceLogger.debug('Starting forward', forward.name);
      await forward.init();
      spourceLogger.debug('Started forward', forward.name);
    } catch(error) {
      spourceLogger.error('Failed to start forward', forward.name, error);
      process.exit(2);
    }
  });

function sortEntriesAlphabetically(a: KVP<string, unknown>, b: KVP<string, unknown>) {
  return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
}
