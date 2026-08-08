import { afterEach, describe, expect, it } from "vitest";
import { storageRoot } from "./lib/config";

describe("storageRoot", () => {
  const original = process.env.VINE_STORAGE_ROOT;

  afterEach(() => {
    if (original === undefined) delete process.env.VINE_STORAGE_ROOT;
    else process.env.VINE_STORAGE_ROOT = original;
  });

  it("defaults to vine when the env var is unset", () => {
    delete process.env.VINE_STORAGE_ROOT;
    expect(storageRoot()).toBe("vine");
  });

  it("reads VINE_STORAGE_ROOT from the environment", () => {
    process.env.VINE_STORAGE_ROOT = "prod";
    expect(storageRoot()).toBe("prod");
  });

  it("lets the --root flag override the env var", () => {
    process.env.VINE_STORAGE_ROOT = "prod";
    expect(storageRoot("maps")).toBe("maps");
  });

  it("rejects an empty or leading-slash root", () => {
    delete process.env.VINE_STORAGE_ROOT;
    expect(() => storageRoot("")).toThrow(/invalid storage root/);
    expect(() => storageRoot("/maps")).toThrow(/invalid storage root/);
  });
});
