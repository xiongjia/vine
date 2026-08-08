import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("maplibre-gl", () => ({ addProtocol: vi.fn() }));
vi.mock("pmtiles", () => {
  const Protocol = vi.fn(() => ({ tile: vi.fn() }));
  return { Protocol };
});

import { addProtocol } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { ensurePmtilesProtocol } from "./pmtiles";

const addProtocolMock = vi.mocked(addProtocol);
const ProtocolMock = vi.mocked(Protocol);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ensurePmtilesProtocol", () => {
  it("registers the pmtiles protocol exactly once", () => {
    ensurePmtilesProtocol();
    ensurePmtilesProtocol();
    expect(ProtocolMock).toHaveBeenCalledTimes(1);
    expect(addProtocolMock).toHaveBeenCalledTimes(1);
    expect(addProtocolMock).toHaveBeenCalledWith("pmtiles", expect.anything());
  });
});
