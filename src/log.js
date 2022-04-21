const chalk = require("chalk");

module.exports = class Logger {
  /**
   * Creates a new logger.
   * @param {(string | () => string)[]} prefixes Prefixes of the logger.
   * @param {Logger | undefined} base Base logger.
   */
  constructor(prefixes, base = undefined) {
    /**
     * Prefixes of the logger.
     * @type {(string | () => string)[]} A an array of strings or factories.
     */
    this.prefixes = prefixes;
    /**
     * Base logger
     * @type {Logger | undefined} Logger instance.
     */
    this.base = base;
  }

  /**
   * Forks the logger.
   * @param {(string | () => string)[]} prefixes Prefixes of the logger.
   */
  fork(prefixes) {
    return new Logger(prefixes, this);
  }

  /**
   * Gets the current prefixes.
   * @returns {string[]} The prefix strings.
   */
  getCurrentPrefixes() {
    let prefixes = [];
    if (this.base) {
      prefixes = prefixes.concat(...this.base.getCurrentPrefixes());
    }
    prefixes = prefixes.concat(...this.prefixes.map(prefix => {
      if (typeof prefix === 'function') {
        return prefix();
      }
      return prefix;
    }));
    return prefixes;
  }

  log(level, ...args) {
    const prefixes = this.getCurrentPrefixes();
    let levelString = `[${level}]`;
    switch (level) {
      case 'error':
        levelString = chalk.bgRed(levelString);
        break;
      case 'warn':
        levelString = chalk.bgYellow(levelString) + ' ';
        break;
      case 'info':
        levelString = chalk.bgBlue(levelString) + ' ';
        break;
      case 'debug':
        levelString = chalk.bgGrey(levelString);
        break;
    }
    console[level](levelString, ...prefixes, ...args);
  }

  debug(...args) {
    this.log('debug', ...args)
  }

  info(...args) {
    this.log('info', ...args)
  }

  warn(...args) {
    this.log('warn', ...args)
  }

  error(...args) {
    this.log('error', ...args)
  }
}
