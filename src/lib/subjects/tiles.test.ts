import { describe, expect, it } from "vitest";
import { subjectTiles } from "@/lib/subjects/tiles";

// The grid was a hardcoded array in which Mathematics read "Coming soon" and
// could not be clicked. A teacher uploaded a Grade 7 algebra deck, approved
// it, and the student's home page went on saying the subject did not exist.
// No upload could ever have changed it, because nothing read the database.

const topic = (id: string, subject: string, title: string) => ({ id, subject, title });

describe("subjectTiles", () => {
  it("gives Maths a tile as soon as a Maths deck is visible", () => {
    const tiles = subjectTiles([topic("d1", "Maths", "Algebra foundations")]);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].name).toBe("Maths");
    expect(tiles[0].topics).toEqual([{ id: "d1", title: "Algebra foundations" }]);
  });

  it("counts the topics in a subject rather than asserting a number", () => {
    const tiles = subjectTiles([
      topic("a", "Physics", "Moments of a Force"),
      topic("b", "Physics", "Distance–Time Graphs"),
      topic("c", "Maths", "Algebra foundations"),
    ]);
    expect(tiles.map((t) => [t.name, t.topics.length])).toEqual([
      ["Maths", 1],
      ["Physics", 2],
    ]);
  });

  it("opens the first topic given, which the caller orders newest-first", () => {
    const tiles = subjectTiles([topic("new", "Physics", "Newest"), topic("old", "Physics", "Oldest")]);
    expect(tiles[0].topics[0].id).toBe("new");
  });

  it("shows nothing for a subject with no material, rather than promising it", () => {
    // The old grid advertised Science and English as "Coming soon" to a school
    // that may never upload either. A tile that cannot be opened is noise.
    const tiles = subjectTiles([topic("a", "Physics", "Moments")]);
    expect(tiles.map((t) => t.name)).toEqual(["Physics"]);
  });

  it("gives a student with no classes an empty grid, not a wall of promises", () => {
    expect(subjectTiles([])).toEqual([]);
  });

  it("styles a subject it has never heard of rather than dropping it", () => {
    // A school uploads Geography. It must still get a usable tile.
    const [tile] = subjectTiles([topic("g", "Geography", "Rivers")]);
    expect(tile.name).toBe("Geography");
    expect(tile.icon).toBeTruthy();
    expect(tile.color).toBeTruthy();
  });

  it("treats Maths and Mathematics as the same look, since schools write both", () => {
    const [a] = subjectTiles([topic("1", "Maths", "x")]);
    const [b] = subjectTiles([topic("2", "Mathematics", "y")]);
    expect(a.icon).toBe(b.icon);
    expect(a.color).toBe(b.color);
  });

  it("does not drop a topic whose subject is blank", () => {
    const [tile] = subjectTiles([topic("x", "", "Untitled upload")]);
    expect(tile.topics).toHaveLength(1);
    expect(tile.name).toBeTruthy();
  });
});
