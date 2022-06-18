<template>
  <v-expand-transition>
    <v-card v-if="jellyfinSearch" style="position: absolute; right: 0; left: 0; z-index: 1;">
      <v-container fluid style="margin-bottom: -8px;">
        <!-- -20px margin to avoid the message field under input and radio buttons -->
        <v-row>
          <v-col cols="12" sm="5" md="4" lg="4" xl="3">
            <v-text-field
              v-model="jellyfinQuery"
              v-on:keyup.enter="searchJellyfin"
              label="Search Jellyfin Server for Media"
              outlined
              dense
              hide-details
              ref="jellyfinSearchInput"
            ></v-text-field>
          </v-col>

          <v-col cols="12" sm="5" md="5" lg="4" xl="3">
            <v-radio-group v-model="searching" row style="margin-top: 0px">
              <v-radio
                label="Movies"
                value="Movie"
                color="primary"
              ></v-radio>
              <v-radio
                label="Both"
                value="Movie,Series"
                color="primary"
              ></v-radio>
              <v-radio
                label="TeeVee"
                value="Series"
                color="primary"
              ></v-radio>
            </v-radio-group>
          </v-col>

          <v-col cols="12" sm="2" md="2" lg="2" xl="2">
            <v-btn @click="searchJellyfin" text color="primary" elevation="3"> Search </v-btn>
          </v-col>
        </v-row>
      <!-- </v-container> -->

        <JellyfinExpansion
          v-if="jellyfinExpansionVisible && jellyfinMedia.TotalRecordCount"
          :media="jellyfinMedia"
        ></JellyfinExpansion>
      </v-container>
    </v-card>
  </v-expand-transition>
</template>

<script>
import JellyfinExpansion from "./JellyfinExpansion.vue";
export default {
  components: { JellyfinExpansion },
  data() {
    return {
      jellyfinSearch: false,
      jellyfinQuery: "",
      searching: "Movie,Series",
      jellyfinExpansionVisible: false,
      jellyfinMedia: {},
    };
  },
  mounted() {
    // Now playing banner
    this.$nuxt.$on("jellyfinSearch", () => {
      this.jellyfinSearch = !this.jellyfinSearch;

      // alert navbar and player of jellyfin state
      $nuxt.$emit("jellyfinSearchState", this.jellyfinSearch );

      // focus search field
      if (this.jellyfin) {
        this.$nextTick(() => {
          if (this.$refs.jellyfinSearchInput) {
            const input = this.$refs.jellyfinSearchInput.$el.querySelector('input:not([type=hidden]),textarea:not([type=hidden])')
            if (input) {
              setTimeout(() => {
                input.focus()
                input.select()
              }, 200)
            }
          }
        });
      }
    });
    this.$nuxt.$on("hideJellyfin", () => {
      this.jellyfinSearch = false;
      // alert navbar of jellyfin state
      $nuxt.$emit("jellyfinSearchState", this.jellyfinSearch );
    });


    // this.$refs.jellyfinSearchInput.$el.focus();
    

    // this.$nuxt.$on("infoModal", () => {
    //   this.infoModal = true;
    // });
    // this.$root.mySocket.on("setNowPlaying", (playing) => {
    //   this.fetchPlaying(playing);
    // });
    // // if client joins room late
    // this.$nuxt.$on("setPlaying", (playing) => {
    //   this.fetchPlaying(playing);
    // });
  },
  methods: {
    async searchJellyfin() {
      try {
        $nuxt.$emit("showLoadingBar", true);
        console.log("jellyfinQuery", this.jellyfinQuery, this.searching);
        var res = await this.$axios.get(
          `${this.$config.BASE_URL}/api/jellyfin/search?searchTerm=${this.jellyfinQuery}&IncludeItemTypes=${this.searching}`
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
          // $nuxt.$emit("jellyfinSearch", res.data);
          this.jellyfinMedia = res.data;
          this.jellyfinExpansionVisible = true;
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
  },
};
</script>

<style>
.playing {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 1;
}
.movie {
  /* display: flex; */
  background-color: #18212e;
  padding: 12px 20px 12px 12px;
  font-family: "Open Sans", sans-serif;
}
.movie__poster {
  margin-right: 15px;
  padding: 5px;
  /* width: 176px; */
}
.movie__poster img {
  border-radius: 5px;
  display: block;
  max-width: 230px;
  max-height: 200px;
  width: auto;
  height: auto;
}
.movie__title {
  display: flex;
  justify-content: space-between;
  margin: 0;
  color: #fff;
  font-size: 20px;
  font-weight: 900;
}
.movie__genres {
  color: #808080;
  margin: 0;
  font-style: italic;
}
.movie__time {
  color: #d3d3d3;
  margin: 5px 0 0 0;
}
.movie__stars {
  margin-top: 5px;
  color: #ffd700;
}
.movie__rating {
  right: 25px;
  position: absolute;
}
.movie__plot {
  margin-top: 5px;
  color: #808080;
  width: 100%;
}

.scrollable {
  overflow-y: scroll;
}
</style>
