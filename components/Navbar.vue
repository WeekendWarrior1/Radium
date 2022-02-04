<template>
  <div>
    <b-navbar type="is-dark" class="radium-navbar">
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
          <!-- <span> -->
            <img src="/jellyfin-icon-transparent.svg" alt="jellyfin">
          <!-- </span> -->
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
  </div>
</template>

<script>
import Info from "./Info";
export default {
  data() {
    return {
      infoModal: false
    };
  },
  mounted() {
    this.$root.mySocket = this.$nuxtSocket({
      teardown: false,
      name: "main"
    });
    this.$nuxt.$on("infoModal", () => {
      this.infoModal = true;
    });
  },
  methods: {
    toggleChat() {
      this.$store.commit("toggleChat");
    },
    info() {
      this.infoModal = true;
    },
    nowplaying() {
      $nuxt.$emit("nowplaying");
    },
    jellyfin() {
      $nuxt.$emit("jellyfin");
    },
    async leaveRoom() {
      // console.log(videojs(document.getElementById('video')).currentTime());
      let currentTime = 0;
      try {
        currentTime = await videojs(document.getElementById('video')).currentTime();
      } catch {
        console.log("Couldn't grab video element, likely not loaded");
      }
      if (this.$store.state.roomUUID && this.$store.state.user) {
        this.$root.mySocket.emit("userLeavesRoom", this.$store.state.roomUUID, this.$store.state.user, currentTime);
      }
      this.$router.push(`/`);
    },
  }
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
