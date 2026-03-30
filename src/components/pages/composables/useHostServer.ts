import { ref } from "vue";
import Peer from "peerjs";
import { Server } from "../../../data/network/server";
import { PEER_ID_PREFIX } from "../../../data/network/constants";
import { getManager, getServer } from "../../../data/context";
import { Team } from "../../../data/team";
import { GameSettings } from "../../../util/localStorage/settings";

export function useHostServer(gameSettings: { value: GameSettings }) {
  const key = ref("");
  const serverStarting = ref(false);
  const promise = ref<Promise<void>>();

  const createServer = (
    name: string,
    team: Team,
    onReady: (server: Server) => void
  ): Promise<void> =>
    new Promise<void>((resolve) => {
      getManager()?.destroy();

      key.value = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");

      const peer = new Peer(PEER_ID_PREFIX + key.value);

      peer.on("error", () => {
        createServer(name, team, onReady).then(resolve);
      });

      peer.once("open", () => {
        peer.off("error");

        const server = new Server(peer);
        server.teamSize = gameSettings.value.teamSize;

        onReady(server);
        resolve();
      });
    });

  const destroyServer = () => {
    if (getServer()) {
      getServer()!.destroy();
    }
  };

  return {
    key,
    serverStarting,
    promise,
    createServer,
    destroyServer,
  };
}
