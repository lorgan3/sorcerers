<script setup lang="ts">
import credits from "../../../credits.json";
</script>

<template>
  <p>
    Sorcerers is made by Lorgan3. The following resources were also used to make
    the game. Feel free to open an issue on
    <a href="https://github.com/lorgan3/sorcerers">GitHub</a> if the there is an
    issue with the credits.
  </p>
  <div class="credits">
    <div class="section" v-for="{ section, authors } in credits">
      <h2>{{ section }}</h2>
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
  </div>

  <div class="buttons">
    <RouterLink to="/" v-slot="{ navigate }">
      <button @click="navigate" class="secondary">Back</button>
    </RouterLink>
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

@media screen and (max-width: 992px) {
  .credits {
    flex-direction: column;
  }
}
</style>
