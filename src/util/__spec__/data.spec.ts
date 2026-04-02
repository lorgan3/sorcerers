import { base64ToBytes, bytesToBase64 } from "../data";

describe("data", () => {
  describe("base64ToBytes", () => {
    it("decodes a known base64 string", () => {
      // "SGVsbG8=" is base64 for "Hello"
      const bytes = base64ToBytes("SGVsbG8=");
      expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
    });

    it("handles empty string", () => {
      const bytes = base64ToBytes("");
      expect(bytes.length).toBe(0);
    });
  });

  describe("bytesToBase64", () => {
    it("encodes a known byte array", () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      expect(bytesToBase64(bytes.buffer)).toBe("SGVsbG8=");
    });
  });

  describe("round-trip", () => {
    it("preserves data through encode then decode", () => {
      const original = new Uint8Array([0, 1, 127, 128, 255]);
      const encoded = bytesToBase64(original.buffer);
      const decoded = base64ToBytes(encoded);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it("preserves large data", () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) original[i] = i;
      const encoded = bytesToBase64(original.buffer);
      const decoded = base64ToBytes(encoded);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });
  });
});
