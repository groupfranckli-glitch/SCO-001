import { describe, expect, it } from "vitest";
import { sniffImage } from "./image-validate";

const pad = (a: number[]) => Uint8Array.from([...a, ...new Array(16).fill(0)]);
const txt = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("sniffImage", () => {
  it("reconnaît JPEG, PNG, WebP et AVIF", () => {
    expect(sniffImage(pad([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(sniffImage(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext).toBe("png");
    expect(sniffImage(pad([...txt("RIFF"), 0, 0, 0, 0, ...txt("WEBP")]))?.ext).toBe("webp");
    expect(sniffImage(pad([0, 0, 0, 0, ...txt("ftypavif")]))?.ext).toBe("avif");
  });
  it("refuse SVG, HTML, scripts et fichiers trop courts", () => {
    expect(sniffImage(pad(txt("<svg xmlns='http://www.w3.org/2000/svg'><script>")))).toBeNull();
    expect(sniffImage(pad(txt("<html><script>alert(1)</script>")))).toBeNull();
    expect(sniffImage(pad(txt("GIF89a")))).toBeNull();
    expect(sniffImage(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});
