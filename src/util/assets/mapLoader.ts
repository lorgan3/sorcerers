import {
  ExtensionType,
  LoaderParser,
  ResolvedAsset,
  extensions,
  settings,
} from "pixi.js";
import { Map } from "../../data/map";

export const MAP_LOADER = "loadMap";

const mapLoader = {
  extension: ExtensionType.LoadParser,
  name: MAP_LOADER,

  load: (url: string) =>
    settings.ADAPTER.fetch(url).then((result) => result.blob()),

  testParse: (_, resolvedAsset?: ResolvedAsset) =>
    Promise.resolve(resolvedAsset?.loadParser === MAP_LOADER),

  parse: async (asset: Blob, resolvedAsset?: ResolvedAsset) => {
    try {
      return await Map.parse(asset);
    } catch (error) {
      console.warn(
        `Error while loading map "${resolvedAsset?.alias?.[0]}"`,
        error
      );
      return null;
    }
  },
} as LoaderParser;

extensions.add(mapLoader);
