/**
 * Either the type directly, or a function that returns the type.
 */
export type MaybeGenerator<T> = T | (() => T);

/**
 * A value that could be an array.
 */
export type MaybeArray<T> = T | T[];

/**
 * A value that could be a promise.
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * A value that might be null or undefined.
 */
export type MaybeMissing<T> = T | undefined | null;

/**
 * A key value pair.
 */
export type KVP<TKey, TValue> = [TKey, TValue];
