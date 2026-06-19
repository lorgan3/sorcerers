import { useMapDraft } from "../../../data/builder/draft";
import { Config, Map } from "../../../data/map";
import { Server } from "../../../data/network/server";
import { Team } from "../../../data/team";
import { defaults, GameSettings } from "../../../util/localStorage/settings";

export function useBuilderMap() {
  const { toConfig, loadConfig } = useMapDraft();

  const handleTest = async (
    onPlay: (key: string, map: Map | Config, settings: GameSettings) => void
  ) => {
    const config = toConfig();
    const server = new Server();
    server.addPlayer("Test player", Team.random());
    onPlay("0000", config, { ...defaults().gameSettings, teamSize: 1 });
  };

  const loadMap = (config: Config, mapName: string) => loadConfig(config, mapName);

  return { handleTest, loadMap };
}
