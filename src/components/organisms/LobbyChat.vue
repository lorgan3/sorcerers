<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { sound } from "@pixi/sound";
import closeIcon from "pixelarticons/svg/close.svg";
import { Sound, getRandomSound } from "../../sound";
import { Manager } from "../../data/network/manager";
import type { ChatEntry } from "../../data/network/types";
import ChatParticles from "../molecules/ChatParticles.vue";
import IconButton from "../atoms/IconButton.vue";
import TornPanel from "../atoms/TornPanel.vue";

const props = defineProps<{
  manager: Manager;
}>();

const isOpen = ref(false);
const draft = ref("");
const flash = ref(false);
const messages = props.manager.chatLog;
const messageList = ref<HTMLDivElement | null>(null);
const particles = ref<InstanceType<typeof ChatParticles> | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);

const wasAtBottom = ref(true);
let lastSoundAt = 0;
let flashTimeout: number | undefined;
let resizeObserver: ResizeObserver | undefined;

const handleScroll = () => {
  const el = messageList.value;
  if (!el) return;
  wasAtBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
};

const scrollToBottom = () => {
  const el = messageList.value;
  if (el) {
    el.scrollTop = el.scrollHeight;
    wasAtBottom.value = true;
  }
};

const playPop = () => {
  const now = performance.now();
  if (now - lastSoundAt < 200) return;
  lastSoundAt = now;
  const data = getRandomSound(Sound.Pop);
  sound.play(data.key, { volume: data.volume });
};

const triggerFlash = () => {
  flash.value = true;
  if (flashTimeout) window.clearTimeout(flashTimeout);
  flashTimeout = window.setTimeout(() => (flash.value = false), 600);
};

const handleChatMessage = (_entry: ChatEntry, byMe: boolean) => {
  particles.value?.emit();

  if (!byMe) {
    playPop();
  }

  if (!isOpen.value) {
    triggerFlash();
  }

  nextTick(() => {
    if (!isOpen.value || wasAtBottom.value) scrollToBottom();
  });
};

const observeMessages = () => {
  resizeObserver?.disconnect();
  if (messageList.value) {
    resizeObserver?.observe(messageList.value);
  }
};

onMounted(() => {
  props.manager.onChatMessage = handleChatMessage;
  if (typeof ResizeObserver !== "undefined") {
    // Re-pin to bottom on every clientHeight change (open/close
    // transitions, hover, etc). Without this, growing the container
    // (e.g. on hover) lets the browser clamp scrollTop down to fit
    // the bigger window — and that smaller scrollTop sticks when the
    // container shrinks back, leaving the last line off-center.
    resizeObserver = new ResizeObserver(() => {
      if (!isOpen.value || wasAtBottom.value) {
        scrollToBottom();
      }
    });
  }
  nextTick(() => {
    scrollToBottom();
    observeMessages();
  });
});

onUnmounted(() => {
  if (props.manager.onChatMessage === handleChatMessage) {
    props.manager.onChatMessage = undefined;
  }
  if (flashTimeout) window.clearTimeout(flashTimeout);
  resizeObserver?.disconnect();
});

watch(isOpen, (open) => {
  // The messages element is recreated when switching between the open
  // panel and the collapsed bar, so re-attach the observer to the new node.
  nextTick(() => {
    observeMessages();
    scrollToBottom();
    if (open) inputEl.value?.focus();
  });
});

const open = () => {
  if (!isOpen.value) isOpen.value = true;
};
const close = () => {
  isOpen.value = false;
};

const send = () => {
  const text = draft.value.trim();
  if (!text) return;
  props.manager.sendChat(text);
  draft.value = "";
};

const handleKey = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
};

const containerClass = computed(() => ({
  "lobby-chat": true,
  "lobby-chat--open": isOpen.value,
  "lobby-chat--flash": flash.value && !isOpen.value,
}));
</script>

<template>
  <div :class="containerClass">
    <ChatParticles ref="particles" class="particles-layer" />

    <TornPanel v-if="isOpen" tear="b" class="panel">
      <IconButton
        class="close-btn"
        :icon="closeIcon"
        title="Close chat"
        :onClick="close"
      />

      <div
        ref="messageList"
        class="messages"
        @scroll="handleScroll"
      >
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message"
        >
          <span class="author" :style="{ color: msg.color }">{{ msg.author }}</span>:
          {{ msg.text }}
        </div>
      </div>

      <div class="input-row">
        <input
          ref="inputEl"
          v-model="draft"
          class="input"
          type="text"
          maxlength="200"
          @keydown="handleKey"
        />
      </div>
    </TornPanel>

    <div v-else class="collapsed-bar">
      <button
        class="open-trigger"
        type="button"
        @click="open"
        title="Open chat"
      />

      <div
        ref="messageList"
        class="messages"
        @scroll="handleScroll"
      >
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message"
        >
          <span class="author" :style="{ color: msg.color }">{{ msg.author }}</span>:
          {{ msg.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "../../style/ornaments" as o;

.lobby-chat {
  position: fixed;
  right: 24px;
  bottom: 0;
  width: 340px;
  height: 36px;
  box-sizing: border-box;
  z-index: 50;

  transition: height 0.3s ease-out;

  display: flex;
  flex-direction: column;

  &:not(.lobby-chat--open):hover {
    height: 42px;
  }
}

.lobby-chat--open {
  height: 400px;
}

.lobby-chat--flash {
  animation: chat-flash 0.6s ease-in-out;
}

@keyframes chat-flash {
  0%, 100% { filter: none; }
  50% { filter: drop-shadow(0 -4px 12px rgba(255, 220, 140, 0.6)); }
}

.panel,
.panel :deep(.torn),
.panel :deep(.content) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.collapsed-bar {
  @include o.dither-surface;
  border: 2px solid var(--border-accent);
  border-radius: 4px 4px 0 0;
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.particles-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
}

.open-trigger {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 2;
}

.close-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
}

.messages {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 4px 12px;
  scrollbar-color: var(--border-accent-faint) transparent;
  scrollbar-width: thin;
}

.lobby-chat:not(.lobby-chat--open) .messages {
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.message {
  margin-bottom: 4px;
  word-wrap: break-word;
  line-height: 1.3;
  color: var(--primary);

  &:last-child {
    margin-bottom: 0;
  }
}

.author {
  font-weight: bold;
  text-shadow: 0 0 1px rgba(0, 0, 0, 0.4);
}

.input-row {
  flex: 0 0 auto;
  padding: 8px 12px;
  border-top: 1px solid var(--border-accent-faint);
}

.input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  font-family: inherit;
  font-size: 14px;
  background: rgba(255, 250, 230, 0.6);
  border: 1px solid var(--border-accent-faint);
  border-radius: 2px;
  color: var(--primary);
  outline: none;

  &:focus {
    border-color: var(--border-accent);
  }
}
</style>
