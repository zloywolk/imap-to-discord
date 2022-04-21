/**
 * Represents a thing.
 */
export default class Thing {
  private values: Record<string, unknown> = {};

  /**
   * Gets all keys of this thing.
   * @returns The keys array.
   */
  public keys() {
    return Object.keys(this.values);
  }

  public append(key: string, value: unknown): this {
    if (this.values.hasOwnProperty(key)) {
      throw new Error('Cannot add duplicate value for ' + key);
    }
    this.values[key] = value;
    return this;
  }

  public get<T>(key: string): T | undefined {
    return this.values[key] as T;
  }
}
