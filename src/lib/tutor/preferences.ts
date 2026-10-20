// Where a student's own choices are kept, and what happens when the key moves.
//
// Two values live in the browser: the English level they picked and whether
// they want Chinese glosses. Nothing about either is secret, and neither is
// worth a round trip to the server, so they sit in localStorage.
//
// They were keyed "verity.*" until the product was named Lectern. Renaming a
// key discards whatever was under the old one, which would have reset every
// student's reading level and Chinese toggle on the morning of the rename —
// invisibly, with no error, and only noticed by a child whose lesson suddenly
// came back in English. A change of product name has no business touching
// what a child chose for themselves.

export const LEVEL_KEY = "lectern.eslLevel";
export const CHINESE_KEY = "lectern.chinese";

/** The keys these replaced. Read once, then removed. */
export const RETIRED_LEVEL_KEY = "verity.eslLevel";
export const RETIRED_CHINESE_KEY = "verity.chinese";

/**
 * The value under `key`, carrying over `retired` the first time.
 *
 * The current key always wins: a student who has chosen since the rename must
 * not have an older preference resurrected over the top of it.
 *
 * Returns null when neither key holds anything, which is the normal case for
 * a student who has never changed the default.
 */
export function carriedOver(
  store: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  key: string,
  retired: string,
): string | null {
  const current = store.getItem(key);
  if (current !== null) return current;

  const previous = store.getItem(retired);
  if (previous === null) return null;

  store.setItem(key, previous);
  store.removeItem(retired);
  return previous;
}
