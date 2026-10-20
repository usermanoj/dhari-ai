import { describe, expect, it } from "vitest";
import {
  CHINESE_KEY,
  LEVEL_KEY,
  RETIRED_CHINESE_KEY,
  RETIRED_LEVEL_KEY,
  carriedOver,
} from "./preferences";

// Renaming the product moved these keys. Without the carry-over, every
// student's English level and Chinese toggle would have reset on the morning
// of the rename — silently, with nothing failing.

function store(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    seen: () => Object.fromEntries(data),
  };
}

describe("carriedOver", () => {
  it("keeps a preference set under the old key", () => {
    const s = store({ [RETIRED_LEVEL_KEY]: "beginner" });
    expect(carriedOver(s, LEVEL_KEY, RETIRED_LEVEL_KEY)).toBe("beginner");
  });

  it("moves it across, so the next read needs no migration", () => {
    const s = store({ [RETIRED_LEVEL_KEY]: "beginner" });
    carriedOver(s, LEVEL_KEY, RETIRED_LEVEL_KEY);
    expect(s.seen()).toEqual({ [LEVEL_KEY]: "beginner" });
  });

  it("lets a choice made since the rename win", () => {
    // A student who has already picked must not have an older preference
    // resurrected over the top of it.
    const s = store({ [LEVEL_KEY]: "advanced", [RETIRED_LEVEL_KEY]: "beginner" });
    expect(carriedOver(s, LEVEL_KEY, RETIRED_LEVEL_KEY)).toBe("advanced");
  });

  it("returns null when the student never chose anything", () => {
    expect(carriedOver(store(), LEVEL_KEY, RETIRED_LEVEL_KEY)).toBeNull();
  });

  it("carries the Chinese toggle too", () => {
    const s = store({ [RETIRED_CHINESE_KEY]: "1" });
    expect(carriedOver(s, CHINESE_KEY, RETIRED_CHINESE_KEY)).toBe("1");
    expect(s.seen()).toEqual({ [CHINESE_KEY]: "1" });
  });

  it("carries an off toggle rather than treating it as unset", () => {
    // "0" is a decision. Losing it is the same bug as losing "1".
    const s = store({ [RETIRED_CHINESE_KEY]: "0" });
    expect(carriedOver(s, CHINESE_KEY, RETIRED_CHINESE_KEY)).toBe("0");
  });

  it("carries the old combined value so the beginner_zh migration still runs", () => {
    // A browser could hold "beginner_zh" under the RETIRED key — two renames
    // deep. It has to survive this one to be migrated by the next step.
    const s = store({ [RETIRED_LEVEL_KEY]: "beginner_zh" });
    expect(carriedOver(s, LEVEL_KEY, RETIRED_LEVEL_KEY)).toBe("beginner_zh");
  });

  it("does not use the old keys for anything else", () => {
    expect(LEVEL_KEY).toBe("lectern.eslLevel");
    expect(CHINESE_KEY).toBe("lectern.chinese");
    expect(RETIRED_LEVEL_KEY).toBe("verity.eslLevel");
    expect(RETIRED_CHINESE_KEY).toBe("verity.chinese");
  });
});
