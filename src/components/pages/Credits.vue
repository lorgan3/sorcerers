<script setup lang="ts">
import credits from "../../../credits.json";
import { useRouter } from "vue-router";
import PixelDivider from "../atoms/PixelDivider.vue";

const router = useRouter();
</script>

<template>
  <p>
    Sorcerers is made by Lorgan3. The following resources were also used to make
    the game. Feel free to open an issue on
    <a href="https://github.com/lorgan3/sorcerers">GitHub</a> if the there is an
    issue with the credits.
  </p>
  <PixelDivider />
  <div class="credits">
    <template
      v-for="({ section, authors }, sectionIndex) in credits"
      :key="section"
    >
      <PixelDivider v-if="sectionIndex > 0" class="col-divider" />
      <div class="section">
        <h2 class="section-heading">{{ section }}</h2>
        <ul>
          <li class="item" v-for="{ author, items } in authors">
            <template v-for="(item, i) in items">
              <a :href="item.link" target="_blank" rel="noopener noreferrer">{{
                item.name
              }}</a>
              <template v-if="i < items.length - 1">, </template></template
            >: {{ author }}
          </li>
        </ul>
      </div>
    </template>
  </div>

  <div class="buttons">
    <button @click="() => router.replace('/')" class="secondary">Back</button>
  </div>
</template>

<style lang="scss" scoped>
.credits {
  display: flex;
  flex-direction: row-reverse;
  gap: 12px;

  .section {
    flex: 1;

    .item {
      -webkit-line-clamp: 2;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      overflow: hidden;

      text-overflow: ellipsis;
    }
  }
}

// On wide screens the sections sit side by side; a divider between every
// column reads as clutter, so the inter-section dividers only show once the
// sections stack vertically.
.credits :deep(.col-divider) {
  display: none;
}

@media screen and (max-width: 992px) {
  .credits {
    flex-direction: column;
  }

  .credits :deep(.col-divider) {
    display: flex;
  }
}
</style>
