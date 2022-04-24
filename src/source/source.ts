import { CacheData, getCacheData, saveCacheData } from "../cache";
import config from "../config";
import EventEmitter from "events";
import Logger from "../log";
import path from 'path';
import Thing from "../thing/thing";

/**
 * A source describes how a message can be fetched.
 */
export default abstract class Source<TCache = CacheData> extends EventEmitter {
  /**
   * The type of the source.
   */
  private readonly type: string;
  /**
   * The cache location of this source or null if disabled.
   */
  private readonly cacheLocation: string | null;

  /**
   * Constructs a new Source.
   * @param logger The logger to use.
   * @param name The name of the source.
   * @param options Options for the source.
   */
  constructor(protected readonly logger: Logger, public readonly name: string, protected readonly options: any) {
    super();
    this.type = config('Type', Error, options);
    this.cacheLocation = config('CacheLocation', config('CacheLocation', path.join(__dirname, '../../cache')), options);
    logger.debug(`Created new source ${name}`);
    // Cache
    this.addListener('message', () => this.saveSourceCache()); // TODO: debounce with initial delay
    this.loadSourceCache();
  }

  /**
   * Initializes the source.
   */
  abstract init(): Promise<void>;

  /**
   * Represents the source as a thing.
   * @returns The source as a thing.
   */
  public getThing(): Thing {
    return new Thing()
      .append('id', this.name)
      .append('type', 'source')
      .append('subtype', this.type)
      .append('name', this.name);
  }

  /**
   * Loads and applies the cache.
   * @returns Once loaded
   */
  private async loadSourceCache() {
    if (!this.cacheLocation) {
      return;
    }

    try {
      this.logger.debug('Loading cache');
      const cacheLocation = path.join(this.cacheLocation, './source/' + this.name);
      const file = path.join(cacheLocation, './cache.jsonc');
      const cache = await getCacheData(file) as any as TCache;
      if (!cache) {
        this.logger.debug('No cache found to load');
        return;
      }
      await this.loadCache(cache);
      this.logger.debug('Loaded cache');
    } catch(error) {
      this.logger.error('Failed to load cache', error);
    }
  }

  /**
   * Saves the cache to the cache file.
   * @returns Once saved
   */
  private async saveSourceCache() {
    if (!this.cacheLocation) {
      return;
    }

    try {
      this.logger.debug('Saving cache');
      const cache = await this.saveCache();
      const cacheLocation = path.join(this.cacheLocation, './source/' + this.name);
      const file = path.join(cacheLocation, './cache.jsonc');
      await saveCacheData(file, cache as any as CacheData);
      this.logger.debug('Saved cache');
    } catch(error) {
      this.logger.error('Failed to save cache', error);
    }
  }

  /**
   * Loads the cache of this source.
   */
  protected abstract loadCache(cache: TCache): Promise<void>;

  /**
   * Saves the cache of this source.
   */
  protected abstract saveCache(): Promise<TCache>;
}
