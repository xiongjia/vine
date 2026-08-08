import { HttpsProxyAgent } from "https-proxy-agent";
import { afterEach, describe, expect, it } from "vitest";
import { contentTypeForKey, proxyAgent } from "./storage";

describe("contentTypeForKey", () => {
  it("maps the published asset extensions to their MIME types", () => {
    expect(contentTypeForKey("widget/map-widget.js")).toBe("text/javascript");
    expect(contentTypeForKey("widget/map-widget.css")).toBe("text/css");
    expect(contentTypeForKey("pmtiles/pmtiles.json")).toBe("application/json");
    expect(contentTypeForKey("pmtiles/shanghai.metadata.json")).toBe(
      "application/json",
    );
    expect(contentTypeForKey("glyphs/Noto Sans Regular/0-255.pbf")).toBe(
      "application/x-protobuf",
    );
  });

  it("keeps octet-stream for binary tiles and unknown extensions", () => {
    expect(contentTypeForKey("pmtiles/shanghai.pmtiles")).toBe(
      "application/octet-stream",
    );
    expect(contentTypeForKey("assets/logo.bin")).toBe(
      "application/octet-stream",
    );
  });

  it("is case-insensitive on the extension", () => {
    expect(contentTypeForKey("widget/Map-Widget.JS")).toBe("text/javascript");
  });
});

describe("proxyAgent", () => {
  // proxyAgent() reads `HTTPS_PROXY ?? https_proxy` — save/restore both so the
  // tests are immune to a proxy set in the developer's shell environment.
  const originalUpper = process.env.HTTPS_PROXY;
  const originalLower = process.env.https_proxy;

  afterEach(() => {
    for (const [key, value] of [
      ["HTTPS_PROXY", originalUpper],
      ["https_proxy", originalLower],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("builds a proxy agent when HTTPS_PROXY is set", () => {
    process.env.HTTPS_PROXY = "http://127.0.0.1:1095";
    delete process.env.https_proxy;
    expect(proxyAgent()).toBeInstanceOf(HttpsProxyAgent);
  });

  it("builds a proxy agent from the lowercase https_proxy fallback", () => {
    delete process.env.HTTPS_PROXY;
    process.env.https_proxy = "http://127.0.0.1:1095";
    expect(proxyAgent()).toBeInstanceOf(HttpsProxyAgent);
  });

  it("returns undefined when no proxy is configured", () => {
    delete process.env.HTTPS_PROXY;
    delete process.env.https_proxy;
    expect(proxyAgent()).toBeUndefined();
  });
});
