import { MaybeGenerator, MaybeMissing } from "../types";

/**
 * Represents a thing.
 */
export default class Thing<T = Record<string, unknown>> {
  /**
   * All values of the thing.
   */
  private readonly _values: Record<string, MaybeGenerator<unknown>>;

  /**
   * Creates a new thing.
   * @param initial The initial value. The reference is not copied.
   */
  constructor(initial: MaybeMissing<{[P in keyof T]: MaybeGenerator<T[P]>}> = undefined) {
    if (initial) {
      this._values = {
        ...initial,
      };
    } else {
      this._values = {};
    }
  }

  /**
   * Gets all keys of this thing.
   * @returns The keys array.
   */
  public keys() {
    return Object.keys(this._values);
  }

  /**
   * Adds a value to the thing.
   * @param key The key to set.
   * @param value The value or generator for the value to set.
   * @returns The thing.
   */
  public append<T = unknown>(key: string, value: MaybeGenerator<T>): this {
    if (this._values.hasOwnProperty(key)) {
      throw new Error('Cannot add duplicate value for ' + key);
    }
    this._values[key] = value;
    return this;
  }

  /**
   * Returns the thing with the given key removed.
   * @param key The key to clear.
   * @returns The thing.
   */
  public clear(key: string): this {
    delete this._values[key];
    return this;
  }

  /**
   * Gets the value for the given key.
   * @param key The key to get.
   * @returns The value at the key, or `undefined` if no such key exists.
   */
  public get<TValue = unknown>(key: string): TValue | undefined {
    const value = this._values[key];
    if (value === undefined) {
      return undefined;
    }
    if (typeof value === 'function') {
      return value();
    }
    return value as TValue;
  }
}
