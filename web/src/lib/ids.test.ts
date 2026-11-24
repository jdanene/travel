import { describe, expect, it } from "vitest";
import { emailKey } from "./ids";

// The header example of emailKey: capitals and dots, as the rules build the key.
describe("emailKey", () => {
  it("lower-cases the email and turns every dot into a comma", () => {
    expect(emailKey("Jo.Owner@Mail.Example.com")).toBe("jo,owner@mail,example,com");
  });
});
