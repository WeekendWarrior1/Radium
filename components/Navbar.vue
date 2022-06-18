<template>
  <!-- <v-app-bar app elevation="4" elevate-on-scroll clipped-right> -->
  <v-app-bar app elevation="4" clipped-right>
    <v-toolbar-title v-if="$nuxt.$route.name == 'index'"
      ><v-img src="/logo.png" alt="Radium" width="140" contain></v-img
    ></v-toolbar-title>
    <v-btn v-if="$nuxt.$route.name != 'index'" @click="leaveRoom">
      <v-icon>mdi-arrow-left</v-icon>
      <!-- <v-img v-if="$nuxt.$route.name == 'index'" src="/logo.png" alt="Radium" width="160" contain></v-img> -->
    </v-btn>
    <!-- TODO if watching media -->
      <v-toolbar-title
        v-if="$nuxt.$route.name != 'index' && this.$store.state.title && ($nuxt.$route.path === `/room/${this.$store.state.titleUUID}`)"
        class="pl-2"
        @mouseenter="nowplaying(true)"
        @mouseleave="nowplaying(false)"
      >
        <!-- TODO add hover with now playing info-->
        {{ this.$store.state.title }}</v-toolbar-title
      >

    <v-spacer></v-spacer>

    <!-- TODO only show if jellyfin enabled on server config -->
    <v-btn v-if="$nuxt.$route.name != 'index'" @click="jellyfinSearch()">
      <v-img class="pr-2" src="/jellyfin-icon-transparent.svg" width="28" contain alt="jellyfin"></v-img>
      Search Jellyfin
    </v-btn>

    <v-btn
      icon
      @click="radiumInfoOpen()"
    >
      <v-icon>mdi-information-outline
      </v-icon>
    </v-btn>

    <v-btn
      v-if="$nuxt.$route.name != 'index'"
      icon
      @mouseenter="userListOpen(true)"
      @mouseleave="userListOpen(false)"
    >
      <v-icon>mdi-account-group
      </v-icon>
    </v-btn>

    <v-btn
      v-if="$nuxt.$route.name != 'index'"
      icon 
      @click="toggleChat"
    >
      <v-icon v-if="this.$store.state.chat"
        >mdi-arrow-collapse-right</v-icon
      >
      <v-icon v-if="!this.$store.state.chat"
        >mdi-comment</v-icon
      >
    </v-btn>

    <v-progress-linear
      :active="showLoadingBar"
      :indeterminate="showLoadingBar"
      height="10"
      bottom
      absolute
    ></v-progress-linear>
  </v-app-bar>
</template>
  <!-- <b-navbar type="is-dark" class="radium-navbar">
      <template slot="brand">
        <b-navbar-item @click="leaveRoom">
          <img src="/logo.png" alt="Radium" />
        </b-navbar-item>
      </template>
      <template slot="start">
        <b-navbar-item
          v-if="$config.PROTECT"
          href="https://github.com/Zibbp/Radium/wiki/Radium-Protect"
          target="_blank"
        >
          🔒 Protect
        </b-navbar-item>
        <b-navbar-item v-if="$nuxt.$route.name != 'index'" @click="info">
          <b-icon icon="information-outline"></b-icon>
        </b-navbar-item>
        <b-navbar-item v-if="$nuxt.$route.name != 'index'" @click="nowplaying">
          <b-icon
            icon="cursor-default-click-outline"
            class="now-playing-icon"
          ></b-icon
          >Now Playing
        </b-navbar-item>
        <b-navbar-item v-if="$nuxt.$route.name != 'index'" @click="jellyfin">
          <img src="/jellyfin-icon-transparent.svg" alt="jellyfin" />
          Search Jellyfin
        </b-navbar-item>
      </template>

      <template slot="end">
        <b-navbar-item tag="div">
          <div class="buttons">
            <b-tooltip
              v-if="this.$store.state.chat && $nuxt.$route.name != 'index'"
              label="Hide Chat"
              :delay="500"
              position="is-left"
              type="is-success"
            >
              <button class="button is-dark" @click="toggleChat">
                <b-icon icon="arrow-collapse-right"></b-icon>
              </button>
            </b-tooltip>
            <b-tooltip
              v-if="!this.$store.state.chat && $nuxt.$route.name != 'index'"
              label="Show Chat"
              :delay="500"
              position="is-left"
              type="is-success"
            >
              <button class="button is-dark" @click="toggleChat">
                <b-icon icon="arrow-collapse-left"></b-icon>
              </button>
            </b-tooltip>
            <b-tag
              v-if="$store.state.user.admin"
              class="admin-tag"
              type="is-info"
              >Admin</b-tag
            >
          </div>
        </b-navbar-item>
      </template>
    </b-navbar>
    <b-modal
      :active.sync="infoModal"
      has-modal-card
      :destroy-on-hide="true"
      scroll="keep"
    >
      <Info />
    </b-modal>
  </div> -->
<!-- </template> -->

<script>
// import Info from "./Info";
export default {
  data() {
    return {
      infoModal: false,
      jellyfinSearchOpen: false,
      showLoadingBar: false,
    };
  },
  mounted() {
    this.$root.mySocket = this.$nuxtSocket({
      teardown: false,
      name: "main",
    });
    this.$nuxt.$on("infoModal", () => {
      this.infoModal = true;
    });
    this.$nuxt.$on("jellyfinSearchState", (jellyfinSearchOpen) => {
      this.jellyfinSearchOpen = jellyfinSearchOpen;
    });
    this.$nuxt.$on("showLoadingBar", (loadingBarState) => {
      this.showLoadingBar = loadingBarState;
    });
  },
  methods: {
    toggleChat() {
      this.$store.commit("toggleChat");
    },
    info() {
      this.infoModal = true;
    },
    nowplaying(hoveringOverTitle) {
      if (this.jellyfinSearchOpen === false) {
        $nuxt.$emit("nowplaying", hoveringOverTitle);
      }
    },
    jellyfinSearch() {
      $nuxt.$emit("jellyfinSearch");
    },
    userListOpen(listVisible) {
      if (this.jellyfinSearchOpen === false) {
        $nuxt.$emit("showUserList", listVisible);
      }
    },
    // radiumInfoOpen(infoVisible) {
    radiumInfoOpen() {
      if (this.jellyfinSearchOpen === false) {
        // $nuxt.$emit("showRadiumInfo", infoVisible);
        $nuxt.$emit("showRadiumInfo");
      }
    },
    async leaveRoom() {
      let currentTime = 0;
      try {
        currentTime = await videojs(
          document.getElementById("video")
        ).currentTime();
      } catch {
        console.log("Couldn't grab video element, likely not loaded");
      }
      if (this.$store.state.roomUUID && this.$store.state.user) {
        this.$root.mySocket.emit(
          "userLeavesRoom",
          this.$store.state.roomUUID,
          this.$store.state.user,
          currentTime
        );
      }
      this.$router.push(`/`);
    },
  },
};
</script>

<style>
.admin-tag {
  margin-bottom: 0.5rem;
  margin-right: 0.5rem;
}
.sync-tooltip {
  margin-right: 0.5rem;
}
.now-playing-icon {
  margin-right: 5px !important;
}
</style>
