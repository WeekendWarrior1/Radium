<template>
  <div>
    <v-expand-transition>
      <v-row justify="center">
        <v-expansion-panels
          v-model="panelsOpen"
          accordion
        >
          <!-- media -->
          <v-expansion-panel
            :key="0"
          >
            <v-expansion-panel-header>{{ mediaToDisplay }}</v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-slide-group
                multiple
                show-arrows
                ref="slideGroupMedia"
              >
                <v-slide-item v-for="item in media.Items" v-bind:key="item.Id" class="pa-1" elevation="8">
                  <v-card
                    class="pa-2 darken-1"
                    elevation="6"
                    max-width="160"
                    @mouseenter="mediaCardHover(item)"
                    @mouseleave="mediaCardHover()"
                  >
                    <!-- <div height="220px"> -->
                    <!-- <div object-fit="cover" > -->
                    <div>
                      <a
                        v-if="item.Type == 'Series'"
                        v-on:click="searchJellyfinSeasons(item)"
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
                    <!-- <div
                      class="pa-1"
                      font-size="1.1rem"
                      style="word-wrap: normal;"
                    >
                      {{ item.Name }}
                    </div>
                    <p
                      class="movie__time"
                      font-size=".95rem"
                    >{{ item.ProductionYear }}</p> -->
                  </v-card>
                </v-slide-item>
              </v-slide-group>
            </v-expansion-panel-content>
          </v-expansion-panel>

          <!-- seasons -->
          <v-expansion-panel v-if="jellyfinSeasons !== null" :key="1">
            <v-expansion-panel-header>{{ seasonToDisplay }}</v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-slide-group
                multiple
                show-arrows
                ref="slideGroupSeasons"
              >
                <v-slide-item v-for="item in jellyfinSeasons.Items" v-bind:key="item.Id" class="pa-1" elevation="8">
                  <v-card
                    class="pa-2 darken-1"
                    elevation="6"
                    max-width="160"
                    @mouseenter="seasonCardHover(item)"
                    @mouseleave="seasonCardHover()"
                  >
                    <div height="220px">
                      <a
                        v-on:click="searchJellyfinEpisodes(item)"
                      >
                        <img
                          v-bind:src="`${parent.$config.BASE_URL}/api/jellyfin/poster?item=${item.Id}&tag=${item.ImageTags.Primary}`"
                        />
                      </a>
                    </div>
                  </v-card>
                </v-slide-item>
              </v-slide-group>
            </v-expansion-panel-content>
          </v-expansion-panel>

          <!-- episodes -->
          <v-expansion-panel v-if="jellyfinEpisodes !== null" :key="2">
            <v-expansion-panel-header>{{ episodeToDisplay }}</v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-slide-group
                multiple
                show-arrows
                ref="slideGroupEpisodes"
              >
                <v-slide-item v-for="item in jellyfinEpisodes.Items" v-bind:key="item.Id" class="pa-1" elevation="8">
                  <v-card
                    class="pa-2 darken-1"
                    elevation="6"
                    max-width="260"
                    @mouseenter="episodeCardHover(item)"
                    @mouseleave="episodeCardHover()"
                  >
                    <div height="220px">
                      <a
                        v-on:click="startEpisode(item)"
                      >
                        <img
                          v-bind:src="`${parent.$config.BASE_URL}/api/jellyfin/poster?item=${item.Id}&tag=${item.ImageTags.Primary}`"
                        />
                      </a>
                    </div>
                  </v-card>
                </v-slide-item>
              </v-slide-group>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-row>
    </v-expand-transition>  

    <!-- movie/episode info popup -->
    <v-expand-transition>
      <v-card v-if="mediaInfoOpen" style="position: absolute; right: 0; left: 0; z-index: 1;">
        <v-container fluid>
          <div style="display: flex;">
            <!-- <div class="movie__poster">
              <img v-bind:src="mediaInfo.Poster" />
            </div> -->
            <div>
              <h2 class="movie__title">
                <!-- <div>
                  {{
                    mediaInfo.SeriesName
                      ? `${mediaInfo.SeriesName}: `
                      : ""
                  }}{{ mediaInfo.Title }} ({{ mediaInfo.Year }})
                </div> -->
                <div class="movie__rating">{{ mediaInfo.OfficialRating }}</div>
              </h2>
              <p v-if="mediaInfo.Genres" class="movie__genres">{{ mediaInfo.Genres.join(", ") }}</p>
              <p v-if="mediaInfo.RunTimeTicks" class="movie__time">{{ `${Math.round(mediaInfo.RunTimeTicks/600000000)} mins` }}</p>
              <div v-if="mediaInfo.CommunityRating" class="movie__stars">
                <p>
                  IMDb Rating
                  <b-icon icon="star" size="is-small"></b-icon>
                  {{ mediaInfo.CommunityRating }} / 10
                </p>

              </div>
              <p v-if="mediaInfo.Overview" class="movie__plot">{{ mediaInfo.Overview }}</p>
            </div>
          </div>  
        </v-container>
      </v-card>
    </v-expand-transition>
  </div>
</template>

<script>
export default {
  // components: { JellyfinSeasons },
  props: ["media"],
  data() {
    return {
      parent: this,
      panelsOpen: null,

      mediaInfoOpen: false,
      mediaInfo: {},

      mediaSelected: null,
      mediaToDisplay: null,

      jellyfinSeasons: null,
      seasonSelected: null,
      seasonToDisplay: null,
      
      jellyfinEpisodes: null,
      episodeSelected: null,
      episodeToDisplay: null,
    }
  },
  mounted() {
    // this expansion is mounted after a jellyfin search is made, so show the search results
    this.openMedia();
  },
  methods: {
    openMedia() {
      this.panelsOpen = 0;
      // https://github.com/vuetifyjs/vuetify/issues/10455
      setTimeout(() => {
        this.$refs.slideGroupMedia.setWidths();
      }, 500);
    },
    openSeasons() {
      this.panelsOpen = 1;
      setTimeout(() => {
        this.$refs.slideGroupSeasons.setWidths();
      }, 500);
    },
    openEpisodes() {
      this.panelsOpen = 2;
      setTimeout(() => {
        this.$refs.slideGroupEpisodes.setWidths();
      }, 500);
    },

    async mediaCardHover(itemHovered) {
      if (itemHovered) {
        this.mediaToDisplay = `${(itemHovered.ProductionYear) ? `(${itemHovered.ProductionYear}) ` : `` } ${itemHovered.Name}`
        this.mediaInfoOpen = true
        this.mediaInfo = itemHovered
        const res = await this.$axios.get(
          `${this.$config.BASE_URL}/api/jellyfin/items?item=${itemHovered.Id}`
        );
        this.mediaInfo = res.data;
      } else {
        this.mediaToDisplay = this.mediaSelected;
        this.mediaInfoOpen = false
        this.mediaInfo = {}
      }
    },
    seasonCardHover(itemHovered) {
      if (itemHovered) {
        this.seasonToDisplay = `${itemHovered.Name}`
      } else {
        this.seasonToDisplay = this.seasonSelected;
      }
    },
    episodeCardHover(itemHovered) {
      if (itemHovered) {
        this.episodeToDisplay = `${itemHovered.IndexNumber}. ${itemHovered.Name}`
        this.mediaInfoOpen = true
        this.mediaInfo = itemHovered
      } else {
        this.episodeToDisplay = this.episodeSelected;
        this.mediaInfoOpen = false
        this.mediaInfo = {}
      }
    },

    async searchJellyfinSeasons(item) {
      console.log("searchJellyfinSeasons(itemId)", item);
      try {
        this.mediaSelected = `${(item.ProductionYear) ? `(${item.ProductionYear}) ` : `` } ${item.Name}`
        this.jellyfinSeasons = null;
        this.seasonSelected = null;
        this.jellyfinEpisodes = null;
        this.episodeSelected = null;
        $nuxt.$emit("showLoadingBar", true);
        var res = await this.$axios.get(
          `${this.$config.BASE_URL}/api/jellyfin/seasons?item=${item.Id}`
        );
        $nuxt.$emit("showLoadingBar", false);

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
          // $nuxt.$emit("searchJellyfinSeasons", res.data);
          this.jellyfinSeasons = res.data;
          this.openSeasons();          
        }
      } catch (error) {
        $nuxt.$emit("showLoadingBar", false);
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
    async searchJellyfinEpisodes(item) {
      try {
        this.seasonSelected = `${item.Name}`
        this.jellyfinEpisodes = null;
        this.episodeSelected = null;
        $nuxt.$emit("showLoadingBar", true);
        var res = await this.$axios.get(
          `${this.$config.BASE_URL}/api/jellyfin/episodes?item=${item.SeriesId}&season=${item.Id}`
        );
        $nuxt.$emit("showLoadingBar", false);

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
          // $nuxt.$emit("searchJellyfinEpisodes", res.data);
          this.jellyfinEpisodes = res.data;
          this.openEpisodes();
        }
      } catch (error) {
        $nuxt.$emit("showLoadingBar", false);
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

    async startEpisode(item) {
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
      await this.getEpisodeInfo(item);
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
      await this.getMovieInfo(item);
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