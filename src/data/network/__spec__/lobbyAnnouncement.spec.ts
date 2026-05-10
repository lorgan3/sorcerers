import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  LobbyAnnouncement,
  type LobbyEntry,
  HEARTBEAT_INTERVAL_MS,
} from "../lobbyAnnouncement";

const fakeRef = { __ref: true };
const onDisconnectMock = {
  remove: vi.fn().mockResolvedValue(undefined),
  cancel: vi.fn().mockResolvedValue(undefined),
};

vi.mock("firebase/database", () => ({
  ref: vi.fn(() => fakeRef),
  set: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  onDisconnect: vi.fn(() => onDisconnectMock),
  serverTimestamp: vi.fn(() => "STAMP"),
  onValue: vi.fn(),
  get: vi.fn(),
  child: vi.fn(),
}));

vi.mock("../../../util/firebase", () => ({
  database: { __db: true },
}));

import * as fbDb from "firebase/database";

const baseEntry: LobbyEntry = {
  joinKey: "1234",
  hostName: "Frodo",
  mapName: "Playground",
  playerCount: 1,
  maxPlayers: 5,
  gameSettings: {
    turnLength: 45,
    gameLength: 10,
    teamSize: 4,
    manaMultiplier: 100,
    itemSpawnChance: 100,
    trustClient: true,
  },
  lastUpdatedAt: 0,
};

describe("LobbyAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("start writes entry, registers onDisconnect, schedules heartbeat", async () => {
    const a = new LobbyAnnouncement();
    await a.start(baseEntry);

    expect(fbDb.ref).toHaveBeenCalledWith({ __db: true }, "lobbies/1234");
    expect(fbDb.set).toHaveBeenCalledWith(fakeRef, {
      ...baseEntry,
      lastUpdatedAt: "STAMP",
    });
    expect(fbDb.onDisconnect).toHaveBeenCalledWith(fakeRef);
    expect(onDisconnectMock.remove).toHaveBeenCalled();
  });

  it("heartbeat re-writes entry every HEARTBEAT_INTERVAL_MS", async () => {
    const a = new LobbyAnnouncement();
    await a.start(baseEntry);

    expect(fbDb.set).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    expect(fbDb.set).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    expect(fbDb.set).toHaveBeenCalledTimes(3);
  });

  it("update merges patch, writes immediately, resets heartbeat", async () => {
    const a = new LobbyAnnouncement();
    await a.start(baseEntry);

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS - 1000);
    a.update({ playerCount: 3 });

    expect(fbDb.set).toHaveBeenCalledTimes(2);
    expect(fbDb.set).toHaveBeenLastCalledWith(fakeRef, {
      ...baseEntry,
      playerCount: 3,
      lastUpdatedAt: "STAMP",
    });

    vi.advanceTimersByTime(1000);
    expect(fbDb.set).toHaveBeenCalledTimes(2); // heartbeat reset, no extra write
  });

  it("stop removes entry, cancels onDisconnect and heartbeat", async () => {
    const a = new LobbyAnnouncement();
    await a.start(baseEntry);

    await a.stop();

    expect(fbDb.remove).toHaveBeenCalledWith(fakeRef);
    expect(onDisconnectMock.cancel).toHaveBeenCalled();

    const setCallsBefore = (fbDb.set as any).mock.calls.length;
    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);
    expect((fbDb.set as any).mock.calls.length).toBe(setCallsBefore);
  });

  it("stop is idempotent", async () => {
    const a = new LobbyAnnouncement();
    await a.start(baseEntry);
    await a.stop();
    await a.stop(); // should not throw
    expect(fbDb.remove).toHaveBeenCalledTimes(1);
  });
});
