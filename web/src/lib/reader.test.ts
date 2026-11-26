import { describe, expect, it } from "vitest";
import { postCard } from "./reader";

describe("postCard", () => {
  it("keeps a card's known fields", () => {
    expect(postCard({ ok: true, name: "keinemusik", kind: "image", caption: "first show" })).toEqual({ name: "keinemusik", kind: "image", caption: "first show" });
  });
  it("refuses a name that is not an account", () => {
    expect(postCard({ name: "x y", kind: "image" })).toBeNull();
  });
  it("drops a picture that is not https", () => {
    expect(postCard({ name: "a", kind: "video", avatarUrl: "http://cdn.example/a.jpg" })).toEqual({ name: "a", kind: "video" });
  });
});
