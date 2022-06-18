<template>
  <v-expand-transition>
    <div>
      <!-- <v-card v-if="searchVisible" style="position: absolute; right: 0; left: 0; z-index: 1;" class="scrollable"> -->
      <v-sheet v-if="searchVisible"  class="scrollable">
      <!-- <div class="playing"> -->
        <!-- <v-row> -->
        <!-- <div v-if="searchVisible" class="movie scrollable"> -->
          <v-slide-group
            multiple
            show-arrows
          >
            <v-slide-item v-for="item in media.Items" v-bind:key="item.Id" class="pa-1" elevation="8">
              <v-card
                class="pa-2 darken-1"
                elevation="6"
                width="160px"
              >
              <!-- <div v-for="item in media.Items" v-bind:key="item.Id"> -->
                <!-- <div class="movie__poster"> -->
                <div>
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
                <!-- <v-card-title
                  class="pa-1"
                  style="word-wrap: normal;"
                >
                  {{ item.Name }}
                </v-card-title> -->
                <div
                  class="pa-1"
                  font-size="1.1rem"
                  style="word-wrap: normal;"
                >
                  {{ item.Name }}
                </div>
                <!-- <h6 class="movie__title">
                  <div>{{ item.Name }}</div>
                </h6> -->
                <p
                  class="movie__time"
                  font-size=".95rem"
                >{{ item.ProductionYear }}</p>
              <!-- </div> -->
              </v-card>
            </v-slide-item>
        <!-- </v-row> -->
        </v-slide-group>
      </v-sheet>
      <JellyfinSeasons />
    </div>
  </v-expand-transition>
</template>

<script>
import JellyfinSeasons from "./JellyfinSeasons.vue";
// import JellyfinExpansion from "./JellyfinExpansion.vue";
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
    async startMovie(item) {
      this.$root.mySocket.emit(
        "changeStream",
        this.$store.state.roomUUID,
        // `${this.$config.BASE_URL}/api/jellyfin/stream.m3u8?item=${item.Id}`,
        `${this.$config.BASE_URL}/api/jellyfin/${this.$store.state.roomUUID}/${item.Id}/stream.m3u8`,
        item.BackdropImageTags.length
          ? `${this.$config.BASE_URL}/api/jellyfin/backdrop?item=${item.Id}&tag=${item.BackdropImageTags[0]}`
          : false
      );
      $nuxt.$emit("hideJellyfin");
      this.getMovieInfo(item);
    },
    async getMovieInfo(item) {
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
  },
};
</script>

<style>
</style>
