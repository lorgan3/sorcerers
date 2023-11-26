import { assertValue, getKey } from "../object";
import { describe, it, expect } from "vitest";

describe("object", () => {
  const object = { foo: 1, bar: 2, baz: 3 };

  describe("getKey", () => {
    it("finds the value in an object", () => {
      expect(getKey(object, 2)).toEqual("bar");

      expect(getKey(object, 5)).toBeUndefined();
      expect(getKey(object, 5, "foo")).toEqual("foo");
    });
  });

  describe("assertValue", () => {
    it("returns the value if it's part of the object", () => {
      expect(assertValue(object, 2)).toEqual(2);

      expect(assertValue(object, 5)).toBeUndefined();
      expect(assertValue(object, 5, 1)).toEqual(1);
    });
  });
});
