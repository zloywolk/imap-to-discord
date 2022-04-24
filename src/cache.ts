import { CommentObject, CommentToken, parse, stringify } from "comment-json";
import fs from 'fs-extra';
import path from "path";

/**
 * Data in a cache.
 */
export type CacheData = CommentObject;

/**
 * Gets the cache file of the imap server. Ensures its directory exists.
 * @returns The path of the file and if it exists.
 */
export async function getCacheData(file: string): Promise<CacheData | null> {
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    const data = await fs.readFile(file, 'utf8');
    return parse(data) as CommentObject;
  } catch(error) {
    return null;
  }
}

/**
 * Saves the cache to the cache file.
 * @param cache The cache
 * @returns Once saved
 */
export async function saveCacheData(file: string, cache: CacheData): Promise<void> {
  await fs.mkdirp(path.dirname(file));
  const str = stringify(cache, null, 2) + '\n';
  await fs.writeFile(file, str, 'utf8');
}

/**
 * Creates a comment.
 * @param target The comment target. (e.g. `before:myProp`, `before-all`, ...)
 * @param comment The actual comment.
 * @returns The comment to be spread into the object.
 */
export function cacheComment(target: string, comment: string): CommentObject {
  const tokens: CommentToken[] = comment.split('\n').map(line => ({
    type: 'LineComment',
    value: ' ' + line,
  } as CommentToken));
  return {
    [Symbol.for(target)]: tokens as any as CommentToken,
  };
}
