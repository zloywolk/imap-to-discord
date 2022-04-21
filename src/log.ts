import chalk from "chalk";
import { MaybeGenerator } from "./types";

/**
 * A log level.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * A logger.
 */
export default class Logger {
  /**
   * Creates a new logger.
   * @param prefixes Prefixes of the logger.
   * @param base Base logger.
   */
  constructor(
    private readonly prefixes: MaybeGenerator<string>[], 
    private readonly base?: Logger) {
  }

  /**
   * Forks the logger.
   * @param prefixes Prefixes of the logger.
   */
  fork(prefixes: MaybeGenerator<string>[]) {
    return new Logger(prefixes, this);
  }

  /**
   * Gets the current prefixes.
   * @returns The prefix strings.
   */
  getCurrentPrefixes() {
    let prefixes: string[] = [];
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

  log(level: LogLevel, ...args: unknown[]) {
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

  debug(...args: unknown[]) {
    this.log('debug', ...args)
  }

  info(...args: unknown[]) {
    this.log('info', ...args)
  }

  warn(...args: unknown[]) {
    this.log('warn', ...args)
  }

  error(...args: unknown[]) {
    this.log('error', ...args)
  }
}
