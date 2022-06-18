<template>
  <v-expand-transition>
    <!-- <v-card v-if="episodesVisible" style="position: absolute; right: 0; left: 0; z-index: 1;" class="scrollable"> -->
    <v-sheet v-if="episodesVisible" class="scrollable">
    <!-- <div class="playing">
      <div v-if="episodesVisible" class="movie scrollable"> -->
      <v-row>
        <v-card v-for="item in episodes.Items" v-bind:key="item.Id" class="pa-1" elevation="3">
        <!-- <div v-for="item in episodes.Items" v-bind:key="item.Id"> -->
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
        <!-- </div> -->
        </v-card>
      </v-row>
      <!-- </div>
    </div> -->
    </v-sheet>
  </v-expand-transition>
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
        this.$store.state.roomUUID,
        // `${this.$config.BASE_URL}/api/jellyfin/stream.m3u8?item=${item.Id}`,
        `${this.$config.BASE_URL}/api/jellyfin/${this.$store.state.roomUUID}/${item.Id}/stream.m3u8`,
        item.ParentBackdropImageTags && item.ParentBackdropImageTags.length
          ? `${this.$config.BASE_URL}/api/jellyfin/backdrop?item=${item.ParentBackdropItemId}&tag=${item.ParentBackdropImageTags[0]}`
          : false
      );
      $nuxt.$emit("hideJellyfin");
      this.getEpisodeInfo(item);
    },
    async getEpisodeInfo(item) {
      const res = await this.$axios.get(
        `${this.$config.BASE_URL}/api/jellyfin/items?item=${item.Id}`
      );

      const mediaInfo = {
        // Poster: res.data,
        Title: res.data.Name,
        Year: res.data.ProductionYear,
        Rated: res.data.OfficialRating,
        Genre: res.data.Genres.join(", "),
        Runtime: `${Math.round(res.data.RunTimeTicks/600000000)} mins`,
        Plot: res.data.Overview,
        imdbRating: res.data.CommunityRating,
        totalRuntimeMS: res.data.RunTimeTicks/10000000,
        SeriesName: res.data.SeriesName,
      };
      if (res.data.ImageTags.Primary) {
        mediaInfo[
          "Poster"
        ] = `${this.$config.BASE_URL}/api/jellyfin/poster?item=${item.Id}&tag=${res.data.ImageTags.Primary}`;
      }
      this.$root.mySocket.emit(
        "nowPlaying",
        this.$store.state.roomUUID,
        mediaInfo
      );
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
