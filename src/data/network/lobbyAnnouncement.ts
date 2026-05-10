import {
  ref as dbRef,
  set,
  remove,
  onDisconnect,
  serverTimestamp,
  type DatabaseReference,
} from "firebase/database";
import { database } from "../../util/firebase";

export const LOBBIES_PATH = "lobbies";
export const HEARTBEAT_INTERVAL_MS = 10_000;
export const STALE_THRESHOLD_MS = 30_000;

export interface LobbyEntry {
  joinKey: string;
  hostName: string;
  mapName: string;
  playerCount: number;
  maxPlayers: number;
  gameSettings: {
    turnLength: number;
    gameLength: number;
    teamSize: number;
    manaMultiplier: number;
    itemSpawnChance: number;
    trustClient: boolean;
  };
  lastUpdatedAt: number;
}

export class LobbyAnnouncement {
  private snapshot: LobbyEntry | null = null;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private ref: DatabaseReference | null = null;
  private disconnectHandler: ReturnType<typeof onDisconnect> | null = null;

  async start(initial: LobbyEntry): Promise<void> {
    this.snapshot = { ...initial };
    this.ref = dbRef(database, `${LOBBIES_PATH}/${initial.joinKey}`);
    this.disconnectHandler = onDisconnect(this.ref);

    await this.disconnectHandler.remove();
    await this.write();
    this.scheduleHeartbeat();
  }

  update(patch: Partial<LobbyEntry>): void {
    if (!this.snapshot || !this.ref) return;
    this.snapshot = { ...this.snapshot, ...patch };
    this.write();
    this.scheduleHeartbeat();
  }

  async stop(): Promise<void> {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    if (this.disconnectHandler) {
      await this.disconnectHandler.cancel();
      this.disconnectHandler = null;
    }
    if (this.ref) {
      await remove(this.ref);
      this.ref = null;
    }
    this.snapshot = null;
  }

  private write(): void {
    if (!this.snapshot || !this.ref) return;
    set(this.ref, {
      ...this.snapshot,
      lastUpdatedAt: serverTimestamp() as unknown as number,
    });
  }

  private scheduleHeartbeat(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
    }
    this.intervalHandle = setInterval(() => this.write(), HEARTBEAT_INTERVAL_MS);
  }
}
