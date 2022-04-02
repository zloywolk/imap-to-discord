const ImapServer = require('./imap-server');
const config = require('./config');
const chalk = require('chalk');
const Logger = require('./log');
const Forward = require('./forward');

const rootLogger = new Logger([
  () => `[${new Date().toISOString()}]`,
]);

rootLogger.info('Environment is', process.env.NODE_ENV);

const imapLogger = rootLogger.fork([chalk.cyan('[imap-server]')]);
const imaps = Object.entries(config('ImapServers')).map(([name, options]) => new ImapServer(imapLogger, name, options));
imaps.forEach(server => {
  server.listen();
  server.addListener('message', async message => {
    imapLogger.info('Message from ' + message.server.name);
    for (const forward of forwards) {
      const done = await forward.forward(message);
      if (done) {
        imapLogger.debug(forward.name + ' marked the message handling as done');
        return;
      }
    }
  });
});

const forwardLogger = rootLogger.fork([chalk.yellow('[forward]')]);
const forwards = Object.entries(config('Forward')).map(([name, options]) => new Forward(forwardLogger, name, options));
