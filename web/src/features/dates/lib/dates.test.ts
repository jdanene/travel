import { describe, expect, it } from "vitest";
import { checkDates, mostYes, notAnswered, summary } from "./dates";

// The header examples of the date counts: the typical case and the surprising one.
const option = { from: "2027-02-13", to: "2027-02-23" };

describe("date counts", () => {
  it("summary counts yes, maybe and no", () => {
    expect(summary(option, { jd: "yes", to: "yes", ka: "maybe", mb: "no" })).toEqual({ nights: 10, yes: 2, maybe: 1, no: 1 });
  });

  it("summary ignores an answer with a wrong value", () => {
    expect(summary(option, { jd: "yes", to: "perhaps" as never })).toEqual({ nights: 10, yes: 1, maybe: 0, no: 0 });
  });

  it("mostYes names the option with the most yes", () => {
    expect(mostYes({ a: option, b: option }, { a: { jd: "yes", to: "yes" }, b: { jd: "yes" } })).toBe("a");
  });

  it("mostYes names none on a tie", () => {
    expect(mostYes({ a: option, b: option }, { a: { jd: "yes" }, b: { to: "yes" } })).toBeNull();
  });

  it("notAnswered lists who has not answered, expected names included", () => {
    const people = notAnswered({ lc: "LC" }, { jd: { name: "JD", reply: "in", at: 1 }, sn: { name: "SN", reply: "maybe", at: 2 } }, { a: option }, { a: { jd: "yes" } });
    expect(people.map((person) => person.name)).toEqual(["SN", "LC"]);
  });

  it("notAnswered leaves out who can't make it", () => {
    expect(notAnswered({}, { rb: { name: "RB", reply: "out", at: 1 } }, { a: option }, {})).toEqual([]);
  });


  it("checkDates accepts two days in the season", () => {
    expect(checkDates({ from: "2027-02-13", to: "2027-02-23" })).toEqual({});
  });

  it("checkDates refuses a To before From, next to To", () => {
    expect(checkDates({ from: "2027-02-13", to: "2027-02-10" })).toEqual({ to: "Pick a day on or after From." });
  });
});
