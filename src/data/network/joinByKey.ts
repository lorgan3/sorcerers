import { Client } from "./client";
import { createClient } from "./index";
import { LAST_GAME_KEY, PEER_ID_PREFIX } from "./constants";
import { defaults } from "../../util/localStorage/settings";
import { get } from "../../util/localStorage";
import { Team } from "../team";
import type { Router } from "vue-router";

export interface JoinByKeyOptions {
  router: Router;
  onError?: () => void;
}

export async function joinByKey(
  key: string,
  { router, onError }: JoinByKeyOptions
): Promise<void> {
  try {
    const settings = defaults(get("Settings"));

    if (!Client.instance) {
      await createClient();
    }

    await Client.instance.join(
      PEER_ID_PREFIX + key,
      settings.name || "Player",
      settings.team || Team.random()
    );

    sessionStorage.setItem(LAST_GAME_KEY, key);
    router.replace(`/join/${key}`);
  } catch (e) {
    onError?.();
    throw e;
  }
}
