// How a subject looks. Nothing here decides WHICH subjects appear — that comes
// from the material a teacher has actually approved for this student.
//
// This grid used to be a hardcoded list in which Mathematics read "Coming
// soon" and could not be clicked. A teacher uploaded a Grade 7 algebra deck,
// approved it, and their student's home page went on saying the subject did
// not exist yet. The product was telling a child their teacher's work was not
// there, and no upload could ever have changed it.
const LOOK: Record<string, { icon: string; color: string }> = {
  physics: { icon: "🧲", color: "#22d3ee" },
  maths: { icon: "📐", color: "#6366f1" },
  mathematics: { icon: "📐", color: "#6366f1" },
  science: { icon: "🔬", color: "#34d399" },
  biology: { icon: "🧬", color: "#34d399" },
  chemistry: { icon: "⚗️", color: "#f59e0b" },
  english: { icon: "📖", color: "#f472b6" },
};
const DEFAULT_LOOK = { icon: "📚", color: "#94a3b8" };

export type SubjectTile = {
  name: string;
  icon: string;
  color: string;
  topics: { id: string; title: string }[];
};

/**
 * One tile per subject the student actually has material in.
 *
 * Ordered by subject name so the grid does not reshuffle itself every time a
 * teacher approves something, and each tile opens the newest topic in that
 * subject — which is the one a student has most likely just been told to read.
 */
export function subjectTiles(topics: { id: string; subject: string; title: string }[]): SubjectTile[] {
  const bySubject = new Map<string, SubjectTile>();
  for (const t of topics) {
    const name = t.subject?.trim() || "Material";
    const look = LOOK[name.toLowerCase()] ?? DEFAULT_LOOK;
    const tile = bySubject.get(name) ?? { name, ...look, topics: [] };
    tile.topics.push({ id: t.id, title: t.title });
    bySubject.set(name, tile);
  }
  return [...bySubject.values()].sort((a, b) => a.name.localeCompare(b.name));
}
