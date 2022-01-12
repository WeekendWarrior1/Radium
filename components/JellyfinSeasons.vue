<template>
  <div class="playing">
    <div v-if="seasonsVisible" class="movie scrollable">
      <div v-for="item in seasons.Items" v-bind:key="item.Id">
        <div class="movie__poster">
          <!-- TODO: fallback to tv show poster if series poster can't be found -->
          <a v-on:click="searchJellyfinEpisodes(item.SeriesId, item.Id)">
            <img
              v-bind:src="`${parent.$config.BASE_URL}/api/jellyfin/poster?item=${item.Id}&tag=${item.ImageTags.Primary}`"
            />
          </a>
        </div>
      </div>
    </div>
    <JellyfinEpisodes />
  </div>
</template>

<script>
import JellyfinEpisodes from "./JellyfinEpisodes.vue";
export default {
  components: { JellyfinEpisodes },
  data() {
    return {
      parent: this, //have to do this to get posters within the for loop
      seasonsVisible: false,
      seasons: {},
      // itemId: "",
    };
  },
  mounted() {
    this.$nuxt.$on("searchJellyfinSeasons", (jellyfinJson) => {
      this.seasons = jellyfinJson;
      this.seasonsVisible = true;
    });
  },
  methods: {
    async searchJellyfinEpisodes(itemId, seasonId) {
      try {
        var res = await this.$axios.get(
          `${this.$config.BASE_URL}/api/jellyfin/episodes?item=${itemId}&season=${seasonId}`
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
          $nuxt.$emit("searchJellyfinEpisodes", res.data);
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
  },
};
</script>

<style>
</style>
