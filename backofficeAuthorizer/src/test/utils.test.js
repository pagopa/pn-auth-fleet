const { expect } = require("chai");

const { arraysOverlap } = require("../app/utils.js");

describe("Test array overlap", () => {
  it("no overlap because empty", () => {
    const userTags = [];
    const apiTags = [];
    const hasOverlap = arraysOverlap(userTags, apiTags);
    expect(hasOverlap).equals(false);
  });

  it("missing overlap because api empty", () => {
    const userTags = ["A"];
    const apiTags = [];
    const hasOverlap = arraysOverlap(userTags, apiTags);
    expect(hasOverlap).equals(false);
  });

  it("missing overlap because user empty", () => {
    const userTags = [];
    const apiTags = ["A"];
    const hasOverlap = arraysOverlap(userTags, apiTags);
    expect(hasOverlap).equals(false);
  });

  it("overlap 1 element", () => {
    const userTags = ["B"];
    const apiTags = ["B"];
    const hasOverlap = arraysOverlap(userTags, apiTags);
    expect(hasOverlap).equals(true);
  });

  it("overlap 2 elemenst", () => {
    const userTags = ["B", "C"];
    const apiTags = ["A", "B"];
    const hasOverlap = arraysOverlap(userTags, apiTags);
    expect(hasOverlap).equals(true);
  });

  it("no overlap with 2 elemenst", () => {
    const userTags = ["B", "C"];
    const apiTags = ["D", "E"];
    const hasOverlap = arraysOverlap(userTags, apiTags);
    expect(hasOverlap).equals(false);
  });
});
