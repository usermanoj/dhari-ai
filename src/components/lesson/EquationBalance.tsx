"use client";

import { useState } from "react";
import { leftSide, parseLinearEquation, range, solution, tilt, working } from "@/lib/visuals/equation";

// The teacher's own equation, on a scale the student can tip.
//
// Rendered per section like FormulaPlayground and TableChart: no catalogue
// entry, no subject gate, no competing for the one-per-lesson slot, and
// nothing at all when the section states no equation to solve — which is most
// of them.
//
// It knows nothing about algebra as a topic. "3x + 2 = 17" and a chemistry
// deck's "2c + 5 = 11" are the same shape and get the same treatment. What it
// will not do is invent: the equation is quoted from the section, the value of
// the unknown is the student's, and the only arithmetic shown is that value
// substituted back in — which is the check the deck itself keeps asking for.
//
// Measured on the school's four approved decks: eight of the algebra deck's
// twenty-one sections, and nothing at all on the three physics ones.

/** One side of the scale. */
function Pan({ value, balanced }: { value: number; balanced: boolean }) {
  return (
    <span
      className="grid h-12 w-20 shrink-0 place-items-center rounded-xl border text-sm tabular-nums transition-colors"
      style={{
        borderColor: balanced ? "var(--good)" : "var(--border)",
        background: balanced ? "rgba(52,211,153,0.12)" : "rgba(0,0,0,0.25)",
      }}
    >
      {value}
    </span>
  );
}

export default function EquationBalance({ text }: { text: string }) {
  const equation = parseLinearEquation(text);
  const span = equation ? range(equation) : null;

  // Opens at zero rather than at the answer. Starting on the solution would
  // hand over the thing the section is asking the student to find.
  const [value, setValue] = useState(0);

  if (!equation || !span) return null;

  const left = leftSide(equation, value);
  const lean = tilt(equation, value);
  const balanced = left === equation.result;

  return (
    <figure className="mt-4 rounded-2xl border border-[var(--border)] bg-black/20 p-4">
      <figcaption className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-widest text-[var(--muted)]">
        <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--brand)] text-[9px] text-white">⚖</span>
        Balance the equation
      </figcaption>

      <p className="mb-4 text-center text-sm text-[var(--brand2)]">{equation.source}</p>

      {/* The beam.
          
          One row that rotates as a unit, with the pans INSIDE it. They were
          first placed at the bar's ends and nudged out by half their own
          width, which put the rising pan outside the figure entirely once the
          bar tilted — every test passed and it was only visible on screen. */}
      <div className="relative mx-auto mb-4 h-28 w-full max-w-sm" aria-hidden="true">
        <div
          className="absolute inset-x-0 top-1/2 flex items-center justify-between transition-transform duration-300"
          // NEGATED, and that is the whole behaviour. CSS rotates clockwise
          // for a positive angle, which lifts the LEFT end — so a positive
          // lean, meaning the left side is the heavier one, was drawn with
          // the heavy side in the air. Every test passed: the tilt arithmetic
          // was right and only the sign of the drawing was wrong, which is
          // visible on a screen and nowhere else.
          style={{ transform: `rotate(${-lean * 10}deg)` }}
        >
          <Pan value={left} balanced={balanced} />
          <div className="mx-2 h-1 flex-1 rounded-full bg-[var(--border)]" />
          <Pan value={equation.result} balanced={balanced} />
        </div>
        <div className="absolute bottom-1 left-1/2 h-12 w-1 -translate-x-1/2 rounded-full bg-[var(--border)]" />
      </div>

      <label className="block">
        <span className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>
            move <span className="text-[var(--text)]">{equation.unknown}</span>
          </span>
          <span className="tabular-nums text-[var(--text)]">{value}</span>
        </span>
        <input
          type="range"
          min={span.min}
          max={span.max}
          step={span.step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="mt-1 w-full accent-[var(--brand)]"
          aria-label={`value of ${equation.unknown}`}
        />
      </label>

      {/* The substitution written out, which is the step the deck asks for by
          name — "Check: 3 × 5 + 2 = 17". */}
      <p className="mt-3 rounded-xl bg-black/25 px-3 py-2 text-center text-sm tabular-nums">
        {working(equation, value)}
      </p>

      <p className="mt-2 text-center text-xs" style={{ color: balanced ? "var(--good)" : "var(--muted)" }}>
        {balanced
          ? `Balanced — ${equation.unknown} = ${solution(equation)}`
          : left > equation.result
            ? "Too big — the left side is heavier"
            : "Too small — the left side is lighter"}
      </p>
    </figure>
  );
}
