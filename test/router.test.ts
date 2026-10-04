import { describe, expect, it } from "vitest";
import { parseRoute } from "../src/router";

describe("parseRoute", () => {
  it("treats an empty hash as the overview", () => {
    expect(parseRoute("")).toEqual({ page: "overview" });
    expect(parseRoute("#")).toEqual({ page: "overview" });
    expect(parseRoute("#/")).toEqual({ page: "overview" });
  });
  it("reads the note and about pages", () => {
    expect(parseRoute("#/note")).toEqual({ page: "note" });
    expect(parseRoute("#/about")).toEqual({ page: "about" });
  });
  it("reads a motivator slug", () => {
    expect(parseRoute("#/m/chance")).toEqual({ page: "motivator", slug: "chance" });
  });
  it("sends anything else to not found", () => {
    expect(parseRoute("#/m/Chance")).toEqual({ page: "notfound", path: "/m/Chance" });
    expect(parseRoute("#/elsewhere")).toEqual({ page: "notfound", path: "/elsewhere" });
  });
});
