/**
 * Either the type directly, or a function that returns the type.
 */
export type MaybeGenerator<T> = T | (() => T);

/**
 * A key value pair.
 */
export type KVP<TKey, TValue> = [TKey, TValue];
