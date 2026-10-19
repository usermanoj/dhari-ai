import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import EquationBalance from "./EquationBalance";

const render = (text: string) => renderToStaticMarkup(<EquationBalance text={text} />);

describe("EquationBalance", () => {
  it("renders nothing when the section states no equation", () => {
    // The contract every per-section visual here shares: silence is correct,
    // not a gap to fill. Thirteen of the algebra deck's twenty-one sections.
    expect(render("Like terms have the same variable part.")).toBe("");
    expect(render("")).toBe("");
  });

  it("shows the teacher's equation exactly as the section states it", () => {
    const html = render("To solve 3x + 2 = 17, subtract 2 from both sides.");
    expect(html).toContain("3x + 2 = 17");
  });

  it("opens away from the answer rather than handing it over", () => {
    // Starting on the solution would give away the thing the section asks the
    // student to find.
    const html = render("4n + 3 = 23");
    expect(html).not.toContain("Balanced");
    expect(html).toContain("value of n");
  });

  it("shows the substitution, which is the check the deck asks for by name", () => {
    // At the opening value of 0: 3 × 0 + 2 = 2.
    expect(render("3x + 2 = 17")).toContain("3 × 0 + 2 = 2");
  });

  it("names which way the scale is wrong", () => {
    expect(render("3x + 2 = 17")).toContain("Too small");
  });

  it("stays silent on a physics deck", () => {
    // "2m x 4N = 8 Nm" is a worked example with units, not an equation to
    // solve for N.
    expect(render("Turning effect = 2m x 4N = 8 Nm, clockwise")).toBe("");
    expect(render("Moment = force × perpendicular distance from the turning point")).toBe("");
  });

  it("does not put a scale on an answer already written down", () => {
    expect(render("4   y = 7\nCheck: 7 + 9 = 16")).toBe("");
  });
});

describe("which way the beam tips", () => {
  // The arithmetic was right and the drawing was upside down: a heavier left
  // side was shown in the air. Pinned by the sign of the rotation, because
  // that is the only part a test can see.
  const angle = (html: string) => Number(/rotate\((-?[\d.]+)deg\)/.exec(html)?.[1] ?? NaN);

  it("drops the heavier side", () => {
    // 3x + 2 = 17 opens at x = 0, so the left side (2) is the LIGHTER one and
    // must rise: clockwise, a positive angle.
    expect(angle(render("3x + 2 = 17"))).toBeGreaterThan(0);
  });

  it("sits level when the two sides match", () => {
    // x + 4 = 11 at the opening value is not level; 0x-style equality is, so
    // use one whose opening value balances: 2x + 0 = 0 has no constant and
    // solves at 0.
    expect(angle(render("2x = 0"))).toBe(0);
  });
});
