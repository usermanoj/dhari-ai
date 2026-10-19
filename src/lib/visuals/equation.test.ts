import { describe, expect, it } from "vitest";
import { leftSide, parseLinearEquation, range, solution, tilt, working } from "./equation";

// Every fixture is a string from the school's own Grade 7 algebra deck.

describe("what it reads", () => {
  it("reads the deck's two-step equations", () => {
    expect(parseLinearEquation("To solve 3x + 2 = 17, subtract 2 from both sides.")).toMatchObject({
      unknown: "x",
      coefficient: 3,
      constant: 2,
      result: 17,
    });
  });

  it("reads a word problem's equation", () => {
    expect(parseLinearEquation("Let n = number of notebooks. 4n + 3 = 23.")).toMatchObject({
      unknown: "n",
      coefficient: 4,
      constant: 3,
      result: 23,
    });
  });

  it("reads a one-step equation with no coefficient", () => {
    expect(parseLinearEquation("To solve x + 4 = 11, subtract 4.")).toMatchObject({
      coefficient: 1,
      constant: 4,
      result: 11,
    });
  });

  it("reads a subtraction", () => {
    expect(parseLinearEquation("Solve 3x - 2 = 7.")).toMatchObject({ coefficient: 3, constant: -2, result: 7 });
  });

  it("reads an equation with no constant", () => {
    expect(parseLinearEquation("3x = 15")).toMatchObject({ coefficient: 3, constant: 0, result: 15 });
  });
});

describe("what it refuses, and must keep refusing", () => {
  // A scale on any of these would teach the wrong idea inside the teacher's
  // own lesson, which is worse than showing nothing.
  it("refuses an unknown on both sides", () => {
    for (const t of ["x + x = 2x", "(3 + 2)x + 4 = 5x + 4", "4x + 3 + 2x = 6x + 3"]) {
      expect(parseLinearEquation(t), t).toBeNull();
    }
  });

  it("refuses two different unknowns", () => {
    expect(parseLinearEquation("3a + 2b = 5ab")).toBeNull();
  });

  it("refuses an answer already written down", () => {
    // The deck states these constantly — "n = 5", "x = 7". There is nothing
    // to discover.
    for (const t of ["n = 5", "x = 7", "Answer: n = 5"]) expect(parseLinearEquation(t), t).toBeNull();
  });

  it("refuses arithmetic with no unknown in it", () => {
    for (const t of ["3 × 5 + 2 = 17", "7 + 4 = 11", "2 × 3 + 3 = 9"]) {
      expect(parseLinearEquation(t), t).toBeNull();
    }
  });

  it("refuses a definition rather than an equation to solve", () => {
    // "Total cost = 3n" defines a rule; it has no numeric right-hand side.
    expect(parseLinearEquation("Total cost = 3n. 3n means 3 × n.")).toBeNull();
  });

  it("refuses prose with no equation at all", () => {
    expect(parseLinearEquation("Like terms have the same variable part.")).toBeNull();
    expect(parseLinearEquation("")).toBeNull();
  });
});

describe("the arithmetic it shows", () => {
  const eq = parseLinearEquation("3x + 2 = 17")!;

  it("solves it", () => {
    expect(solution(eq)).toBe(5);
  });

  it("evaluates the left side for whatever the student picked", () => {
    expect(leftSide(eq, 5)).toBe(17);
    expect(leftSide(eq, 4)).toBe(14);
  });

  it("writes the substitution out the way a worked example does", () => {
    expect(working(eq, 5)).toBe("3 × 5 + 2 = 17");
  });

  it("writes a subtraction with a real minus sign, not a hyphen", () => {
    const minus = parseLinearEquation("3x - 2 = 7")!;
    expect(minus.source).toBe("3x − 2 = 7");
    expect(working(minus, 3)).toBe("3 × 3 − 2 = 7");
  });

  it("drops a coefficient of one rather than writing 1x", () => {
    const one = parseLinearEquation("x + 4 = 11")!;
    expect(one.source).toBe("x + 4 = 11");
    expect(working(one, 7)).toBe("7 + 4 = 11");
  });
});

describe("the beam", () => {
  const eq = parseLinearEquation("3x + 2 = 17")!;

  it("sits level at the answer", () => {
    expect(tilt(eq, 5)).toBe(0);
  });

  it("tips the way the error goes", () => {
    expect(tilt(eq, 2)).toBeLessThan(0);
    expect(tilt(eq, 9)).toBeGreaterThan(0);
  });

  it("stops at its stops rather than spinning", () => {
    expect(tilt(eq, 10_000)).toBe(1);
    expect(tilt(eq, -10_000)).toBe(-1);
  });

  it("tips the same for the same proportional error, whatever the numbers", () => {
    // A scale reading 17 and one reading 1700 must behave alike.
    const big = parseLinearEquation("3y + 200 = 1700")!;
    expect(Math.sign(tilt(big, 0))).toBe(Math.sign(tilt(eq, 0)));
  });
});

describe("the slider", () => {
  it("steps in whole numbers when the teacher wrote whole numbers", () => {
    expect(range(parseLinearEquation("3x + 2 = 17")!).step).toBe(1);
  });

  it("reaches past the answer so the student can overshoot it", () => {
    const r = range(parseLinearEquation("3x + 2 = 17")!);
    expect(r.max).toBeGreaterThan(solution(parseLinearEquation("3x + 2 = 17")!));
  });
});

describe("a list number is not a coefficient", () => {
  // Verbatim from the deck's answer slide. The 4 is answer number four.
  it("does not read '4   y = 7' as 4y = 7", () => {
    expect(parseLinearEquation("4   y = 7\nCheck: 7 + 9 = 16")).toBeNull();
  });

  it("still reads a coefficient that touches its letter", () => {
    expect(parseLinearEquation("4y = 7")).toMatchObject({ coefficient: 4, result: 7 });
  });

  it("still reads one joined by a multiplication sign", () => {
    expect(parseLinearEquation("3 × x = 15")).toMatchObject({ coefficient: 3, result: 15 });
  });

  it("does not read a numbered list item as an equation", () => {
    expect(parseLinearEquation("5   x = 4\nCheck: 5 × 4 − 4 = 16")).toBeNull();
  });
});

describe("an expression that continues past the equals sign", () => {
  it("does not read the substitution slide's working as an equation", () => {
    // Verbatim. The answer on this slide is 4; the old regex offered 0.33.
    expect(
      parseLinearEquation("Evaluate 3n + 2 when n = 4. 3n + 2 = 3 × 4 + 2. Replace n with 4. = 12 + 2. = 14."),
    ).toBeNull();
  });

  it("still reads one that simply ends", () => {
    expect(parseLinearEquation("3n + 2 = 14. Then add.")).toMatchObject({ result: 14 });
  });
});

describe("a unit is not an unknown", () => {
  it("does not solve for newtons", () => {
    // Verbatim from the Moments deck. N is the unit.
    expect(parseLinearEquation("Turning effect = 2m x 4N = 8 Nm, clockwise")).toBeNull();
  });

  it("leaves the physics decks alone entirely", () => {
    for (const t of [
      "Moment = force × perpendicular distance from the turning point",
      "A magnet has two poles, north and south.",
    ]) {
      expect(parseLinearEquation(t), t).toBeNull();
    }
  });
});
