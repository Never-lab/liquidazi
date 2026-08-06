import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLOUD_SAVE_MS,
  createCloudSaveQueue,
  type CloudSaveStatus,
} from "./cloudSaveQueue";

describe("cloudSaveQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces to 15s and reports pending → syncing → saved", async () => {
    const statuses: CloudSaveStatus[] = [];
    const put = vi.fn(async () => ({}));
    const q = createCloudSaveQueue({
      put,
      getToken: () => "tok",
      getPayload: () => ({ slots: [], activeSlot: 0 }),
      onStatus: (s) => statuses.push(s),
      onError: () => {},
    });

    q.schedule();
    q.schedule();
    expect(put).not.toHaveBeenCalled();
    expect(statuses.at(-1)).toBe("pending");

    await vi.advanceTimersByTimeAsync(CLOUD_SAVE_MS - 1);
    expect(put).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(put).toHaveBeenCalledTimes(1);
    expect(statuses).toContain("syncing");
    await Promise.resolve();
    expect(statuses.at(-1)).toBe("saved");
  });

  it("flush runs immediately when pending", async () => {
    const put = vi.fn(async () => ({}));
    const q = createCloudSaveQueue({
      put,
      getToken: () => "tok",
      getPayload: () => ({ slots: [], activeSlot: 0 }),
      onStatus: () => {},
      onError: () => {},
    });

    q.schedule();
    await q.flush();
    expect(put).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(CLOUD_SAVE_MS);
    expect(put).toHaveBeenCalledTimes(1);
  });

  it("clear cancels pending timer", async () => {
    const put = vi.fn(async () => ({}));
    const q = createCloudSaveQueue({
      put,
      getToken: () => "tok",
      getPayload: () => ({ slots: [], activeSlot: 0 }),
      onStatus: () => {},
      onError: () => {},
    });

    q.schedule();
    q.clear();
    await vi.advanceTimersByTimeAsync(CLOUD_SAVE_MS);
    expect(put).not.toHaveBeenCalled();
  });
});
