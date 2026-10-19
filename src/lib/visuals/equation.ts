// A linear equation the teacher wrote, turned into something a student can
// move.
//
// The deck this was built for states the same shape over and over — "3x + 2 =
// 17", "4n + 3 = 23", "x + 4 = 11" — and none of the existing interactives
// touch any of it. parseFormula wants a rule relating named quantities
// ("Moment = force x distance") and deliberately rejects operands containing
// digits, so every algebra equation falls straight through it. The relationship
// detector wants comparative words. The catalogue is ten physics regexes.
// Measured on the real deck: fifteen sections, zero visuals.
//
// This carries no subject knowledge either. A linear equation in one unknown
// is a shape, not a topic: a chemistry deck balancing a concentration and a
// maths deck solving for x get the same treatment.
//
// THE HONESTY RULE, as everywhere else here: the equation shown is quoted from
// the section, and the value of the unknown is whatever the student chooses.
// Nothing is asserted that the teacher did not write.

export type LinearEquation = {
  /** The letter standing for the unknown — "x", "n". */
  unknown: string;
  /** What multiplies it. Never 0. */
  coefficient: number;
  /** What is added to it. Negative when the teacher wrote a minus. */
  constant: number;
  /** What the left-hand side must come to. */
  result: number;
  /** The equation as it will be shown, rebuilt so spacing is consistent. */
  source: string;
};

/**
 * `ax + b = c`, with the unknown on the left and a plain number on the right.
 *
 * Deliberately narrow. The same deck also contains "x + x = 2x", "3a + 2b =
 * 5ab" and "(3 + 2)x + 4 = 5x + 4", none of which is a thing to solve by
 * balancing, and a scale that pretended otherwise would teach the wrong idea
 * in the teacher's own lesson. Everything with an unknown on BOTH sides is
 * refused by the lookahead after the equals sign.
 *
 * That lookahead bans a LETTER only. It used to ban "." as well, to stop the
 * number being read short — which the decimal group already prevents, while
 * the full stop that ends a sentence is the commonest thing after an equation
 * in prose. "4n + 3 = 23." matched nothing at all.
 *
 * A coefficient must TOUCH its letter, or be joined to it by an explicit
 * multiplication sign. Allowing whitespace between them read the answer list
 *
 *     4   y = 7
 *
 * as "4y = 7" and would have shown a child y = 1.75 on a slide whose own
 * answer is 7. The number was the list item. Found by reading the sections
 * this fired on rather than counting them.
 *
 * The right-hand side must be a COMPLETE number. The substitution slide writes
 *
 *     3n + 2 = 3 × 4 + 2
 *
 * and stopping at the first number read that as "3n + 2 = 3", offering a child
 * n = 0.33 on a slide whose own answer is 4. Anything that continues into an
 * expression is refused.
 *
 * The unknown must be LOWERCASE. The physics deck writes "2m x 4N = 8 Nm", and
 * N there is newtons — a unit, not something to solve for. School algebra uses
 * lowercase letters for unknowns, so this is a cheap and reliable separation;
 * a deck that solves for an uppercase letter is a deliberate loss, and a far
 * better one than putting a nonsense balance on a worked example.
 */
const LINEAR =
  /(\d+(?:\.\d+)?)?(?:\s*[*×]\s*)?([a-z])\s*(?:([+\-])\s*(\d+(?:\.\d+)?)\s*)?=\s*(-?\d+(?:\.\d+)?)(?![A-Za-z])(?!\s*[×*+/÷-])/g;

export function parseLinearEquation(text: string): LinearEquation | null {
  for (const m of text.matchAll(LINEAR)) {
    const coefficient = m[1] === undefined ? 1 : Number(m[1]);
    const sign = m[3] === "-" ? -1 : 1;
    const constant = m[4] === undefined ? 0 : sign * Number(m[4]);
    const result = Number(m[5]);
    const unknown = m[2];

    if (!Number.isFinite(coefficient) || !Number.isFinite(constant) || !Number.isFinite(result)) continue;

    // Nothing to balance. "n = 5" and "x = 7" are the ANSWER written down,
    // which this deck does constantly — putting a scale on one would ask a
    // student to discover a number already printed beside it.
    if (coefficient === 1 && constant === 0) continue;

    // 0x + b = c has no unknown in it at all.
    if (coefficient === 0) continue;

    // The unknown must not also appear on the right. The lookahead above stops
    // "5x", but "= 5" followed later by the letter is worth refusing too when
    // the two sides are plainly the same expression.
    return { unknown, coefficient, constant, result, source: render(unknown, coefficient, constant, result) };
  }
  return null;
}

function render(unknown: string, coefficient: number, constant: number, result: number): string {
  const left = `${coefficient === 1 ? "" : coefficient}${unknown}`;
  const middle = constant === 0 ? "" : constant > 0 ? ` + ${constant}` : ` − ${Math.abs(constant)}`;
  return `${left}${middle} = ${result}`;
}

/** What the left-hand side comes to for a given value of the unknown. */
export function leftSide(eq: LinearEquation, value: number): number {
  return round(eq.coefficient * value + eq.constant);
}

/** The value that balances it. May be a fraction; the deck's own are whole. */
export function solution(eq: LinearEquation): number {
  return round((eq.result - eq.constant) / eq.coefficient);
}

/**
 * The substitution written out, the way a worked example writes it.
 *
 * Showing the arithmetic rather than only "balanced" is the point: a student
 * watching "3 × 5 + 2 = 17" is watching the equation being checked, which is
 * the step the deck keeps asking them to do.
 */
export function working(eq: LinearEquation, value: number): string {
  const product = `${eq.coefficient === 1 ? "" : `${eq.coefficient} × `}${round(value)}`;
  const plus = eq.constant === 0 ? "" : eq.constant > 0 ? ` + ${eq.constant}` : ` − ${Math.abs(eq.constant)}`;
  return `${product}${plus} = ${leftSide(eq, value)}`;
}

/**
 * How far the beam tips, from -1 (left side too small) to 1 (too big).
 *
 * Scaled against the equation's own numbers rather than a fixed span, so a
 * scale reading 17 and one reading 1700 tip the same amount for the same
 * proportional error — and clamped, because a student dragging to the end of
 * the range should see a beam on its stop, not one spinning.
 */
export function tilt(eq: LinearEquation, value: number): number {
  const span = Math.max(Math.abs(eq.result), 1);
  return clamp((leftSide(eq, value) - eq.result) / span, -1, 1);
}

/** Whole numbers where the teacher wrote whole numbers. */
export function range(eq: LinearEquation): { min: number; max: number; step: number } {
  const answer = solution(eq);
  const max = Math.max(10, Math.ceil(Math.abs(answer) * 2));
  const whole = Number.isInteger(eq.coefficient) && Number.isInteger(eq.constant) && Number.isInteger(answer);
  return { min: 0, max, step: whole ? 1 : 0.5 };
}

const round = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
