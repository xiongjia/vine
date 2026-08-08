import { HttpsProxyAgent } from "https-proxy-agent";
import { afterEach, describe, expect, it } from "vitest";
import { proxyAgent } from "./storage";

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
