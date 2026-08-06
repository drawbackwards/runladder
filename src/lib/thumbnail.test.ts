import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the Blob SDK so upload/delete are observable without network. sharp is
// not exercised here (makeThumbnail has its own image path); we test the #442
// externalization helpers, which are the new correctness surface.
const put = vi.fn();
const del = vi.fn();
vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => put(...args),
  del: (...args: unknown[]) => del(...args),
}));

import { uploadScoreThumbnail, deleteScoreThumbnail } from "./thumbnail";

const DATA_URL = "data:image/jpeg;base64," + Buffer.from("hello").toString("base64");

describe("uploadScoreThumbnail (#442)", () => {
  beforeEach(() => {
    put.mockReset();
    del.mockReset();
  });

  it("uploads a data URL to a private, per-user blob and returns the URL", async () => {
    put.mockResolvedValue({ url: "https://blob.example/score-thumbs/u1/s1-xyz" });
    const url = await uploadScoreThumbnail("u1", "s1", DATA_URL);

    expect(url).toBe("https://blob.example/score-thumbs/u1/s1-xyz");
    expect(put).toHaveBeenCalledTimes(1);
    const [path, bytes, opts] = put.mock.calls[0];
    expect(path).toBe("score-thumbs/u1/s1");
    expect(Buffer.isBuffer(bytes)).toBe(true);
    // Private access + a random suffix are the privacy guarantee: no guessable
    // public URL for a paid user's screenshot.
    expect(opts).toMatchObject({ access: "private", addRandomSuffix: true, contentType: "image/jpeg" });
  });

  it("returns null (and never uploads) for a non-data-URL input", async () => {
    expect(await uploadScoreThumbnail("u1", "s1", "not-a-data-url")).toBeNull();
    expect(await uploadScoreThumbnail("u1", "s1", "")).toBeNull();
    expect(put).not.toHaveBeenCalled();
  });

  it("degrades to null when the blob upload throws (never blocks a score)", async () => {
    put.mockRejectedValue(new Error("blob down"));
    expect(await uploadScoreThumbnail("u1", "s1", DATA_URL)).toBeNull();
  });
});

describe("deleteScoreThumbnail (#442)", () => {
  beforeEach(() => del.mockReset());

  it("delegates to blob del", async () => {
    del.mockResolvedValue(undefined);
    await deleteScoreThumbnail("https://blob.example/x");
    expect(del).toHaveBeenCalledWith("https://blob.example/x");
  });

  it("swallows delete errors (an orphaned blob is not a correctness failure)", async () => {
    del.mockRejectedValue(new Error("nope"));
    await expect(deleteScoreThumbnail("https://blob.example/x")).resolves.toBeUndefined();
  });
});
