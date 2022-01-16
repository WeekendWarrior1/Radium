<template>
  <div class="playing">
    <div v-if="searchVisible" class="movie scrollable">
      <div v-for="item in media.Items" v-bind:key="item.Id">
        <div class="movie__poster">
          <a
            v-if="item.Type == 'Series'"
            v-on:click="searchJellyfinSeasons(item.Id)"
          >
            <img
              v-bind:src="`${parent.$config.BASE_URL}/api/jellyfin/poster?item=${item.Id}&tag=${item.BackdropImageTags[0]}`"
            />
          </a>
          <a v-else v-on:click="startMovie(item)">
            <img
              v-bind:src="`${parent.$config.BASE_URL}/api/jellyfin/poster?item=${item.Id}&tag=${item.BackdropImageTags[0]}`"
            />
          </a>
        </div>
        <h6 class="movie__title">
          <div>{{ item.Name }}</div>
        </h6>
        <p class="movie__time">{{ item.ProductionYear }}</p>
      </div>
    </div>
    <JellyfinSeasons />
  </div>
</template>

<script>
import JellyfinSeasons from "./JellyfinSeasons.vue";
export default {
  components: { JellyfinSeasons },
  data() {
    return {
      parent: this, //have to do this to get posters within the for loop
      searchVisible: false,
      // TODO get child element visibility variables and return false (to hide season and episode dialogues)
      media: {},
    };
  },
  mounted() {
    this.$nuxt.$on("jellyfinSearch", (jellyfinJson) => {
      this.media = jellyfinJson;
      // this.searchVisible = !this.searchVisible;
      this.searchVisible = true;
      // JellyfinSeasons.seasonsVisible = false;
    });
  },
  methods: {
    async searchJellyfinSeasons(itemId) {
      console.log("searchJellyfinSeasons(itemId)", itemId);
      try {
        var res = await this.$axios.get(
          `${this.$config.BASE_URL}/api/jellyfin/seasons?item=${itemId}`
        );

        if (res.data.Error) {
          $nuxt.$emit("stopLoading");
          this.$buefy.toast.open({
            duration: 2000,
            message: `${res.data.Error}`,
            position: "is-bottom",
            type: "is-danger",
          });
        } else {
          console.log(res.data);
          $nuxt.$emit("searchJellyfinSeasons", res.data);
        }
      } catch (error) {
        console.log(error);
        $nuxt.$emit("stopLoading");
        this.$buefy.toast.open({
          duration: 2000,
          message: `Error`,
          position: "is-bottom",
          type: "is-warning",
        });
      }
    },
    startMovie(item) {
      this.$root.mySocket.emit(
        "changeStream",
        item.Id,
        `${this.$config.BASE_URL}/api/jellyfin/stream.m3u8?item=${item.Id}`,
        item.BackdropImageTags.length
          ? `${this.$config.BASE_URL}/api/jellyfin/backdrop?item=${item.Id}&tag=${item.BackdropImageTags[0]}`
          : false
      );
      this.$nuxt.$emit("hideJellyfin");
    },
  },
};
</script>

<style>
</style>
