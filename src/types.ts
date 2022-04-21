/**
 * Either the type directly, or a function that returns the type.
 */
export type MaybeGenerator<T> = T | (() => T);

export type MaybeArray<T> = T | T[];

export type MaybePromise<T> = T | Promise<T>;

/**
 * A key value pair.
 */
export type KVP<TKey, TValue> = [TKey, TValue];
