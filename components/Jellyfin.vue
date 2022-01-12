<template>
  <div v-if="jellyfin" class="playing">
    <div class="movie">
      <!-- <div class="movie__poster">
        <img v-bind:src="media.Poster" />
      </div>
      <div>
        <h2 class="movie__title">
          <div>{{ media.Title }} ({{ media.Year }})</div>
          <div class="movie__rating">{{ media.Rated }}</div>
        </h2>
        <p class="movie__genres">{{ media.Genre }}</p>
        <p class="movie__time">{{ media.Runtime }}</p>
        <div class="movie__stars">
          <p>
            IMDb Rating
            <b-icon icon="star" size="is-small"></b-icon>
            {{ media.imdbRating }} / 10
          </p>

        </div>
        <p class="movie__plot">{{ media.Plot }}</p>
      </div>
    </div> -->
      <form v-on:submit.prevent>
        <label class="label has-text-white"
          >Search Jellyfin Server for Media</label
        >
        <div class="field is-grouped">
          <p class="control is-expanded">
            <input v-model="jellyfinQuery" class="input" type="text" />
          </p>

          <input
            type="radio"
            id="movies"
            name="searching"
            value="Movie"
            v-model="searching"
          />
          <label class="label has-text-white" for="movies">Movies</label><br />
          <input
            type="radio"
            id="both"
            name="searching"
            value="Movie,Series"
            v-model="searching"
          />
          <label class="label has-text-white" for="both">Both</label><br />
          <input
            type="radio"
            id="series"
            name="searching"
            value="Series"
            v-model="searching"
            checked="checked"
          />
          <label class="label has-text-white" for="series">TeeVee</label>
          <div>
            <p class="control">
              <a class="button is-black" @click="searchJellyfin">Search</a>
            </p>
          </div>
        </div>
      </form>
    </div>
    <JellyfinSearch />
  </div>
</template>

<script>
import JellyfinSearch from "./JellyfinSearch.vue";
export default {
  components: { JellyfinSearch },
  data() {
    return {
      jellyfin: false,
      jellyfinQuery: "",
      searching: "Movie,Series",
      // JellyfinSearch: false,
      // jellyfinJson: {},
    };
  },
  mounted() {
    // Now playing banner
    this.$nuxt.$on("jellyfin", () => {
      // this.$nuxt.$emit("nowplaying");
      this.jellyfin = !this.jellyfin;
      // this.JellyfinSearch = false;
    });
    this.$nuxt.$on("hideJellyfin", () => {
      this.jellyfin = false;
    });
    this.$nuxt.$on("infoModal", () => {
      this.infoModal = true;
    });
    this.$root.mySocket.on("setNowPlaying", (playing) => {
      this.fetchPlaying(playing);
    });
    // if client joins room late
    this.$nuxt.$on("setPlaying", (playing) => {
      this.fetchPlaying(playing);
    });
  },
  methods: {
    async fetchPlaying(playing) {
      try {
        if (playing == null) {
        } else {
          var res = await this.$axios.get(
            `https://www.omdbapi.com?apikey=${this.$config.OMDB_API_KEY}&t=${playing}`
          );
          if (res.data.Error == "Movie not found!") {
            $nuxt.$emit("stopLoading");
            this.$buefy.toast.open({
              duration: 2000,
              message: `Can't find ${playing}`,
              position: "is-bottom",
              type: "is-danger",
            });
          } else {
            this.media = res.data;
            $nuxt.$emit("stopLoading");
            this.$buefy.toast.open({
              duration: 2000,
              message: `Now Playing ${playing}`,
              position: "is-bottom",
              type: "is-success",
            });
          }
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
    async searchJellyfin() {
      try {
        console.log("jellyfinQuery", this.jellyfinQuery, this.searching);
        var res = await this.$axios.get(
          `${this.$config.BASE_URL}/api/jellyfin/search?searchTerm=${this.jellyfinQuery}&IncludeItemTypes=${this.searching}`
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
          $nuxt.$emit("jellyfinSearch", res.data);
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
.playing {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 1;
}
.movie {
  display: flex;
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
