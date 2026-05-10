<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { sound } from "@pixi/sound";
import { Sound, getRandomSound } from "../../sound";
import { Manager } from "../../data/network/manager";
import type { ChatEntry } from "../../data/network/types";
import ChatParticles from "../molecules/ChatParticles.vue";

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

const handleScroll = () => {
  const el = messageList.value;
  if (!el) return;
  wasAtBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
};

const scrollToBottom = () => {
  const el = messageList.value;
  if (el) el.scrollTop = el.scrollHeight;
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
    if (wasAtBottom.value) scrollToBottom();
  });
};

onMounted(() => {
  props.manager.onChatMessage = handleChatMessage;
  nextTick(scrollToBottom);
});

onUnmounted(() => {
  if (props.manager.onChatMessage === handleChatMessage) {
    props.manager.onChatMessage = undefined;
  }
  if (flashTimeout) window.clearTimeout(flashTimeout);
});

watch(isOpen, (open) => {
  if (open) {
    nextTick(() => {
      scrollToBottom();
      inputEl.value?.focus();
    });
  }
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

    <button
      v-if="!isOpen"
      class="slice"
      type="button"
      @click="open"
      title="Open chat"
    >
      <span class="slice-label">Chat</span>
    </button>

    <template v-else>
      <div class="header">
        <h3>Chat</h3>
        <button class="close" type="button" @click="close" title="Close chat">×</button>
      </div>
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
          placeholder="type a message…"
          @keydown="handleKey"
        />
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.lobby-chat {
  position: fixed;
  right: 24px;
  bottom: 0;
  width: 340px;
  height: 400px;
  box-sizing: border-box;
  z-index: 50;

  background: url("../../assets/parchment.png");
  background-size: 256px;
  image-rendering: pixelated;
  border: 3px solid var(--border-accent);
  border-radius: 4px 4px 0 0;
  box-shadow:
    0 0 20px inset rgba(64, 32, 32, 0.3),
    0 -4px 20px rgba(0, 0, 0, 0.4),
    0 0 0 1px var(--border-accent-faint);

  transform: translateY(calc(100% - 28px));
  transition: transform 0.3s ease-out;

  display: flex;
  flex-direction: column;
}

.lobby-chat--open {
  transform: translateY(0);
}

.lobby-chat--flash {
  animation: chat-flash 0.6s ease-in-out;
}

@keyframes chat-flash {
  0%, 100% {
    box-shadow:
      0 0 20px inset rgba(64, 32, 32, 0.3),
      0 -4px 20px rgba(0, 0, 0, 0.4),
      0 0 0 1px var(--border-accent-faint);
    transform: translateY(calc(100% - 28px));
  }
  50% {
    box-shadow:
      0 0 20px inset rgba(64, 32, 32, 0.3),
      0 -4px 30px rgba(255, 220, 140, 0.5),
      0 0 0 1px var(--border-accent-faint);
    transform: translateY(calc(100% - 36px));
  }
}

.particles-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
}

.slice {
  width: 100%;
  height: 28px;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  color: var(--border-accent);
  font-size: 14px;
}

.slice-label {
  font-weight: bold;
  letter-spacing: 1px;
}

.header {
  flex: 0 0 auto;
  height: 36px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-accent-faint);
}

.header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--border-accent);
}

.close {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: var(--border-accent);
  padding: 0 4px;
}

.messages {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 8px 12px;
  scrollbar-color: var(--border-accent-faint) transparent;
  scrollbar-width: thin;
}

.message {
  margin-bottom: 4px;
  word-wrap: break-word;
  line-height: 1.3;
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
  padding: 6px 8px;
  font-family: inherit;
  font-size: 14px;
  background: rgba(255, 250, 230, 0.6);
  border: 1px solid var(--border-accent-faint);
  border-radius: 2px;
  color: inherit;
  outline: none;

  &:focus {
    border-color: var(--border-accent);
  }
}
</style>
