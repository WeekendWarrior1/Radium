<template>
  <div class="playing">
    <div v-if="episodesVisible" class="movie scrollable">
      <div v-for="item in episodes.Items" v-bind:key="item.Id">
        <div class="movie__poster">
          <!-- TODO: fallback to tv show poster if series poster can't be found -->
          <a v-on:click="startEpisode(item)">
            <img
              v-bind:src="`${parent.$config.BASE_URL}/api/jellyfin/poster?item=${item.Id}&tag=${item.ImageTags.Primary}`"
            />
          </a>
        </div>
        <p class="movie__title">{{ item.IndexNumber }}. {{ item.Name }}</p>
        <p class="movie__time">{{ item.Overview }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      parent: this, //have to do this to get posters within the for loop
      episodesVisible: false,
      episodes: {},
      // itemId: "",
    };
  },
  mounted() {
    this.$nuxt.$on("searchJellyfinEpisodes", (jellyfinJson) => {
      this.episodes = jellyfinJson;
      this.episodesVisible = true;
    });
  },
  methods: {
    startEpisode(item) {
      this.$root.mySocket.emit(
        "changeStream",
        item.Id,
        `${this.$config.BASE_URL}/api/jellyfin/stream.m3u8?item=${item.Id}`,
        item.ParentBackdropImageTags.length
          ? `${this.$config.BASE_URL}/api/jellyfin/backdrop?item=${item.ParentBackdropItemId}&tag=${item.ParentBackdropImageTags[0]}`
          : false
      );
      this.$nuxt.$emit("hideJellyfin");
    },
    // async searchJellyfinEpisodes(itemId, seasonId) {
    //   console.log("searchJellyfinEpisodes(seasonId)", itemId, seasonId);
    //   try {
    //     var res = await this.$axios.get(
    //       `${this.$config.BASE_URL}/api/jellyfin/episodes?item=${itemId}&season=${seasonId}`
    //     );

    //     if (res.data.Error) {
    //       $nuxt.$emit("stopLoading");
    //       this.$buefy.toast.open({
    //         duration: 2000,
    //         message: `${res.data.Error}`,
    //         position: "is-bottom",
    //         type: "is-danger",
    //       });
    //     } else {
    //       console.log(res.data);
    //       $nuxt.$emit("searchJellyfinEpisodes", res.data);
    //     }
    //   } catch (error) {
    //     console.log(error);
    //     $nuxt.$emit("stopLoading");
    //     this.$buefy.toast.open({
    //       duration: 2000,
    //       message: `Error`,
    //       position: "is-bottom",
    //       type: "is-warning",
    //     });
    //   }
    // },
  },
};
</script>

<style>
</style>
