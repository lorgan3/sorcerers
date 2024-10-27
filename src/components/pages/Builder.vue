<script setup lang="ts">
import { Ref, onMounted, ref, watch } from "vue";
import { Map, Layer, Config } from "../../data/map";
import Input from "../atoms/Input.vue";
import { Server } from "../../data/network/server";
import { Team } from "../../data/team";
import BoundingBox from "../molecules/BoundingBox.vue";
import { BBox } from "../../data/map/bbox";
import { useRouter } from "vue-router";
import { logEvent } from "../../util/firebase";
import { GameSettings } from "../../util/localStorage/settings";
import { defaults } from "../../util/localStorage/settings";
import MapSelect from "../organisms/MapSelect.vue";
import BuilderSettings, {
  AdvancedSettings,
} from "../organisms/BuilderSettings.vue";
import ImageInput from "../molecules/ImageInput.vue";
import IconButton from "../atoms/IconButton.vue";
import plus from "pixelarticons/svg/plus.svg";
import Collapsible from "../atoms/Collapsible.vue";

const { onPlay, config } = defineProps<{
  onPlay: (key: string, map: Map | Config, settings: GameSettings) => void;
  config?: Config;
}>();
const router = useRouter();
const preview = ref<HTMLDivElement>();

const name = ref("");
const terrain = ref({ data: "", visible: false });
const mask = ref({ data: "", visible: false });
const background = ref({ data: "", visible: false });
const layers = ref<Array<Layer & { visible: boolean }>>([]);
const ladders = ref<BBox[]>([]);
const creatingLadder = ref(false);

const settingsOpen = ref(false);
const advancedSettings = ref<AdvancedSettings>({
  scale: 6,
  bbox: BBox.create(0, 0),
  customMask: false,
  parallaxName: "",
  parallaxOffset: 0,
});

onMounted(async () => {
  if (config) {
    loadMap(config, "");
  }
});

watch(
  () => advancedSettings.value.customMask,
  (useMask) => {
    if (!useMask) {
      mask.value = { data: "", visible: false };
    }
  }
);

const oldScale = ref(advancedSettings.value.scale);
watch(
  () => advancedSettings.value.scale,
  (scale) => {
    ladders.value = ladders.value.map((ladder) =>
      ladder.withScale(scale / oldScale.value)
    );
    oldScale.value = scale;
  }
);

const addImageFactory =
  (ref: Ref, visible = true) =>
  (_: File, data: string) => {
    ref.value = { data, visible };

    if (advancedSettings.value.bbox.isEmpty()) {
      var image = new Image();
      image.src = data;

      image.onload = () => {
        advancedSettings.value.bbox = BBox.create(image.width, image.height);
      };
    }
  };

const handleAddTerrain = addImageFactory(terrain);
const handleSetTerrainVisibility = (visible: boolean) =>
  (terrain.value.visible = visible);
const handleAddMask = addImageFactory(mask, false);
const handleSetMaskVisibility = (visible: boolean) =>
  (mask.value.visible = visible);

const handleAddBackground = addImageFactory(background);
const handleSetBackgroundVisibility = (visible: boolean) =>
  (background.value.visible = visible);

const handleBuild = async () => {
  const map = await Map.fromConfig({
    terrain: { data: terrain.value.data, mask: mask.value.data },
    background: background.value.data
      ? { data: background.value.data }
      : undefined,
    layers: layers.value
      .filter((layer) => !!layer.data)
      .map((layer) => ({ ...layer })),
    bbox: advancedSettings.value.bbox,
    parallax: {
      name: advancedSettings.value.parallaxName,
      offset: advancedSettings.value.parallaxOffset,
    },
    scale: advancedSettings.value.scale,
    ladders: ladders.value,
  });

  const url = URL.createObjectURL(await map.toBlob());
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);

  const link = document.createElement("a");
  link.download = `${name.value || "map"}.png`;
  link.href = url;
  link.click();

  logEvent("build_map");
};

const handleTest = async () => {
  const config: Config = {
    terrain: { data: terrain.value.data, mask: mask.value.data },
    background: background.value.data
      ? { data: background.value.data }
      : undefined,
    layers: layers.value
      .filter((layer) => !!layer.data)
      .map((layer) => ({ ...layer })),
    bbox: advancedSettings.value.bbox,
    parallax: {
      name: advancedSettings.value.parallaxName,
      offset: advancedSettings.value.parallaxOffset,
    },
    scale: advancedSettings.value.scale,
    ladders: ladders.value,
  };

  const server = new Server();
  server.addPlayer("Test player", Team.random());
  onPlay("0000", config, { ...defaults().gameSettings, teamSize: 1 });
};

const loadMap = (config: Config, map: string) => {
  oldScale.value = config.scale;
  terrain.value = { data: config.terrain.data as string, visible: true };
  background.value = {
    data: (config.background?.data as string) || "",
    visible: true,
  };
  layers.value = config.layers.map((layer) => ({ ...layer, visible: true }));
  advancedSettings.value = {
    bbox: BBox.fromJS(config.bbox) || BBox.create(0, 0),
    scale: config.scale,
    customMask: !!config.terrain.mask,
    parallaxName: config.parallax.name,
    parallaxOffset: config.parallax.offset,
  };
  name.value = map;
  ladders.value =
    (config.ladders
      ?.map((bbox) => BBox.fromJS(bbox))
      .filter(Boolean) as BBox[]) || [];

  if (config.terrain.mask) {
    mask.value = { data: config.terrain.mask as string, visible: false };
  } else {
    mask.value = { data: "", visible: false };
  }
};

const handleAddLayer = () =>
  layers.value.push({
    data: "",
    x: Math.round(preview.value!.scrollLeft / advancedSettings.value.scale),
    y: Math.round(preview.value!.scrollTop / advancedSettings.value.scale),
    visible: true,
  });

const handleRemoveLayer = (index: number) => {
  layers.value = layers.value.filter((_, i) => i !== index);
};

const handleSetLayerVisibility = (visible: boolean, index: number) => {
  layers.value[index].visible = visible;
};

const handleMouseDown = (event: MouseEvent, layer: Layer) => {
  let x = layer.x;
  let y = layer.y;
  let startX = event.pageX;
  let startY = event.pageY;

  const handleMouseMove = (moveEvent: MouseEvent) => {
    layer.x =
      x + Math.round((moveEvent.pageX - startX) / advancedSettings.value.scale);
    layer.y =
      y + Math.round((moveEvent.pageY - startY) / advancedSettings.value.scale);
  };

  const handleMouseUp = () => {
    document.onselectstart = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  event.preventDefault();
  document.onselectstart = () => false;
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
};

const handleBBoxChange = (newBBox: BBox) => {
  advancedSettings.value.bbox = newBBox;
};

const handleCreateLadder = (event: MouseEvent) => {
  if (!creatingLadder.value) {
    return;
  }

  event.preventDefault();
  const position = preview.value!.getBoundingClientRect();
  const x = Math.round(
    (position.left - preview.value!.scrollLeft) / advancedSettings.value.scale
  );
  const y = Math.round(
    (position.top - preview.value!.scrollTop) / advancedSettings.value.scale
  );
  const startX = Math.round(event.pageX / advancedSettings.value.scale) - x;
  const startY = Math.round(event.pageY / advancedSettings.value.scale) - y;

  ladders.value.push(
    BBox.fromJS({
      left: startX,
      top: startY,
      right: startX,
      bottom: startY,
    })!
  );

  const handleMouseMove = (moveEvent: MouseEvent) => {
    ladders.value[ladders.value.length - 1].right = Math.max(
      startX,
      Math.round(moveEvent.pageX / advancedSettings.value.scale) - x
    );
    ladders.value[ladders.value.length - 1].bottom = Math.max(
      startY,
      Math.round(moveEvent.pageY / advancedSettings.value.scale) - y
    );
  };

  const handleMouseUp = () => {
    document.onselectstart = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    creatingLadder.value = false;
  };

  event.preventDefault();
  document.onselectstart = () => false;
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
};
</script>

<template>
  <div class="builder" :style="{ '--scale': advancedSettings.scale }">
    <section class="controls flex-list">
      <Input label="Name" autofocus v-model="name" />
      <div class="section">
        <ImageInput
          name="Terrain"
          :onAdd="handleAddTerrain"
          v-model="terrain.data"
          :onToggleVisibility="handleSetTerrainVisibility"
          clearable
        />
        <ImageInput
          v-if="advancedSettings.customMask"
          name="Mask"
          :onAdd="handleAddMask"
          v-model="mask.data"
          :onToggleVisibility="handleSetMaskVisibility"
          clearable
          defaultHidden
        />
        <ImageInput
          name="Background"
          :onAdd="handleAddBackground"
          v-model="background.data"
          :onToggleVisibility="handleSetBackgroundVisibility"
          clearable
        />
      </div>

      <div class="section">
        <h2>
          Overlays
          <IconButton
            title="Add layer"
            :onClick="handleAddLayer"
            :icon="plus"
          />
        </h2>
        <div v-for="(layer, i) in layers" class="section">
          <ImageInput
            :name="`Layer ${i}`"
            :onClear="() => handleRemoveLayer(i)"
            v-model="(layer.data as string)"
            :onToggleVisibility="(visible: boolean) => handleSetLayerVisibility(visible, i)"
            clearable
          />
        </div>
      </div>

      <div class="section">
        <h2>
          Ladders {{ ladders.length ? `(${ladders.length})` : "" }}
          <IconButton
            title="Add ladder"
            :onClick="() => (creatingLadder = true)"
            :icon="plus"
          />
        </h2>
      </div>

      <div class="section">
        <button class="secondary" @click="settingsOpen = true">
          Adv. settings
        </button>
        <BuilderSettings
          v-if="settingsOpen"
          :settings="advancedSettings"
          :onClose="() => (settingsOpen = false)"
        />
      </div>

      <button
        class="primary"
        title="Build and save map to file system"
        @click="handleBuild"
      >
        Build
      </button>
      <button class="primary" title="Build and test" @click="handleTest">
        Test
      </button>
      <button class="secondary" @click="() => router.replace('/')">Back</button>
    </section>
    <section
      :class="{ preview: true, 'add-ladder': creatingLadder }"
      ref="preview"
      @mousedown="handleCreateLadder"
    >
      <div v-if="!terrain.data && !background.data" class="description">
        <p>
          Building your own maps is very easy thanks to the builder. Only a
          terrain image is needed to start testing! All configuration options
          are explained below. If something is not clear, consider making an
          <a
            href="https://github.com/lorgan3/sorcerers/issues"
            target="_blank"
            rel="noopener noreferrer"
            >issue on GitHub</a
          >. If you just want to quickly have a look at an existing map you can
          do so here:
        </p>
        <MapSelect :onEdit="loadMap" />

        <div class="section">
          <Collapsible title="Terrain">
            <p>
              A map needs at least a terrain to be playable. The terrain is the
              layer that can be blown up and by default this is what the
              sorcerers stand on. At the default scale (6x6), a character is 6
              pixels wide and 16 pixels high. They can jump about 21 pixels
              high. You can use this template
              <img src="../../assets/mask.png" alt="Mask" title="Mask" /> when
              making the basic outline of your map to make sure the scale is
              correct. Generally the height of an area should be a lot higher
              than 21 pixels to prevent it from feeling cramped.
            </p>
          </Collapsible>
        </div>

        <div class="section">
          <Collapsible title="Wallmask">
            <p>
              In the advanced settings you can enable the wallmask, this will
              overwrite the default wallmask that gets generated from the
              terrain. You can use this feature if you want to add things to
              your map that can be blown up but not collide with the sorcerers.
              You can also use it for example for stairs that have distinct
              steps but a smooth diagonal wallmask so it can be scaled without
              jumping. The wallmask is always 6x6 so it will have to be scaled
              down if you use a smaller scale (eg if you have a terrain that's
              600 pixels wide on scale 3, the wallmask should be scaled down 50%
              to 300 pixels to match). Because the wallmask is not shown to the
              player this image can be black + transparent to reduce the file
              size.
            </p>
          </Collapsible>
        </div>

        <div class="section">
          <Collapsible title="Background">
            <p>
              The background is placed behind the sorcerers and can't be blown
              up. It can be used to show where the terrain used to be after it
              has been blown up and to add some more detail to the map.
              Typically the colors used for the background are less saturated so
              it's clear what's part of the terrain and what is not. The sky
              does not need to be part of the background, you can use a built in
              parallax background for this in the advanced settings.
            </p>
          </Collapsible>
        </div>

        <div class="section">
          <Collapsible title="Overlays">
            <p>
              Overlays are drawn on top of the sorcerers and become transparent
              for sorcerers intersecting them. This means the image should fit
              the content closely and generally be fairly rectangular. Overlays
              can be dragged in the right position after adding. They can be
              used for sorcerers to hide behind and can get blown up like the
              terrain.
            </p>
          </Collapsible>
        </div>

        <div class="section">
          <Collapsible title="Advanced settings">
            <ul>
              <li>
                <h4>Scale</h4>
                <p>
                  The scale is the resolution of the map, a smaller scale can be
                  used to add more detail to the map. Keep in mind that
                  collisions (the wallmask) are always at the 6x6 scale. For
                  this reason multiples of 6 (6, 3, 2, 1) are preferred. It is
                  recommended to first plan out the layout of your map at the
                  6x6 scale and then scale it up if you want to work at a higher
                  resolution.
                </p>
              </li>
              <li>
                <h4>Spawn area</h4>
                <p>
                  The spawn area can either be changed from the advanced
                  settings or by dragging the red box in the builder. The spawn
                  area dictates where sorcerers can spawn at the start of the
                  game.
                </p>
              </li>
              <li>
                <h4>Parallax background & vertical offset</h4>
                <p>
                  A parallax background adds some more depth to the game by
                  making details in the distance move slower than details closer
                  by. The vertical offset can be used to move the still layers
                  up or down. If you wish to add your own parallax background,
                  pull requests are welcome! Take a look at
                  <code>src/data/map/background.ts</code> to see how they're
                  configured.
                </p>
              </li>
            </ul>
          </Collapsible>
        </div>

        <div class="section">
          <Collapsible title="Publishing" defaultOpen>
            <p>
              If you made a cool map that you want to share, feel free to make a
              pull request to add it to the game (See
              <code>src/util/assets/constants.ts</code>). If you do not know how
              to use git you can also
              <a
                href="https://github.com/lorgan3/sorcerers/issues"
                target="_blank"
                rel="noopener noreferrer"
                >open an issue</a
              >
              so someone else can add it for you. All reasonable maps will be
              accepted, if you have a crazy idea consider contacting me first if
              you want to ensure it can get added to the game.<br />
              Please optimize the images first (eg
              <a
                href="https://imageoptim.com/mac"
                target="_blank"
                rel="noopener noreferrer"
                >imageOptim</a
              >) before compiling the final version of your map, this can easily
              cut the filesize in half.
            </p>
          </Collapsible>
        </div>
      </div>
      <img v-if="background.visible" :src="background.data" class="layer" />
      <img v-if="terrain.visible" :src="terrain.data" class="layer" />
      <img v-if="mask.visible" :src="mask.data" class="layer wallmask" />
      <template v-for="(layer, i) in layers">
        <div
          v-if="layer.visible"
          class="overlay"
          @mousedown="(event: MouseEvent) => handleMouseDown(event, layer)"
          :style="{
            translate: `${layer.x * advancedSettings.scale}px ${
              layer.y * advancedSettings.scale
            }px`,
          }"
        >
          <span class="meta">Layer {{ i }} ({{ layer.x }}, {{ layer.y }})</span>
          <img :src="(layer.data as string)" />
        </div>
      </template>
      <BoundingBox :bbox="advancedSettings.bbox" :onChange="handleBBoxChange" />
      <BoundingBox
        v-for="(ladder, i) in ladders"
        :bbox="ladder"
        :onChange="(bbox) => (ladders[i] = bbox)"
        :onClear="() => ladders.splice(i, 1)"
        color="#00f"
        draggable
      />
    </section>
  </div>
</template>

<style lang="scss" scoped>
.builder {
  height: 100vh;
  display: flex;

  box-sizing: border-box;
  background: url("../../assets/parchment.png");
  image-rendering: pixelated;
  background-size: 256px;
  z-index: 1;

  .controls {
    width: 200px;
    border-right: 4px solid var(--primary);
    box-shadow: 5px 0 10px #00000069;
    padding: 10px;
    overflow-y: auto;

    .section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .layer-title {
      display: flex;
      justify-content: space-between;

      .close-button {
        background: none;
        border: none;
        margin: 0;
        padding: 0;
        cursor: pointer;
        font-size: 18px;
      }
    }

    .inputButton {
      .placeholder {
        width: 100%;
        height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--background);
        cursor: pointer;
        box-shadow: 0 0 10px inset var(--primary);
        border-radius: var(--small-radius);
      }

      img {
        width: 100%;
        height: 100px;
        object-fit: cover;
        box-shadow: 0 0 10px inset var(--primary);
        border-radius: var(--small-radius);

        &:hover {
          object-fit: contain;
        }
      }
    }
  }

  .preview {
    overflow: auto;
    position: relative;
    flex: 1;

    &.add-ladder {
      cursor: context-menu;
    }

    img.layer {
      position: absolute;
      transform-origin: 0 0;
      scale: var(--scale) var(--scale);
      image-rendering: pixelated;

      &.wallmask {
        scale: 6 6;
      }
    }

    .overlay {
      cursor: grab;
      position: relative;

      .meta {
        display: none;
        position: absolute;
        font-family: Eternal;
        font-size: 36px;
        top: -40px;
        z-index: 100;
      }

      img {
        position: absolute;
        top: 0;
        left: 0;
        transform-origin: 0 0;
        scale: var(--scale) var(--scale);
        image-rendering: pixelated;
      }

      &:hover {
        img {
          top: calc(var(--scale) * -1px);
          left: calc(var(--scale) * -1px);
          border: 1px solid rgba(0, 0, 0, 0.6);
        }

        .meta {
          display: block;
        }
      }
    }

    .description {
      position: absolute;
      padding: 20px;
      max-width: 800px;

      .section {
        margin-top: 16px;
      }

      ul {
        margin-left: 10px;
      }

      h4 {
        margin-top: 10px;
      }

      code {
        font-family: monospace;
        font-size: 14px;
      }
    }
  }
}
</style>
