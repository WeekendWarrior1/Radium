<template>
  <v-expand-transition>
    <v-card v-if="remoteMediaVisible" style="position: absolute; right: 0; left: 0; z-index: 1;">
      <v-container fluid >
        <v-row>
          <v-col cols="12" sm="10" md="10" lg="10" xl="10">
            <v-text-field
              v-on:keyup.enter="directUrlOrYTDLP"
              label="Video file url"
              outlined
              dense
              hide-details
              ref="remoteMediaInput"
            ></v-text-field>
          </v-col>

          <v-col cols="12" sm="2" md="2" lg="2" xl="2">
            <v-btn @click="directUrlOrYTDLP" text color="primary" elevation="3"> Play Remote Media </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-card>
  </v-expand-transition>
</template>

<script>
export default {
  data() {
    return {
      remoteMediaVisible: false,
      videoFileExtensions: [
        '.mp4',
        '.mkv',
        '.mov',
        '.avi',
        '.flv',
        '.webm',
        '.mpg',
        '.ts',
        '.mpeg',
        '.m4v',
        '.wmv',
        '.ogg'
      ]
    };
  },
  mounted() {
    this.$nuxt.$on("remoteMediaToggle", async () => {
      this.remoteMediaVisible = !this.remoteMediaVisible;
    });
  },
  methods: {
    async directUrlOrYTDLP () {
      const remoteFile = this.$refs.remoteMediaInput.$el.querySelector('input:not([type=hidden]),textarea:not([type=hidden])').value;
      console.log('directUrlOrYTDLP', remoteFile);
      if (remoteFile === '') {
        // TODO print error that no remote media file selected
        return;
      }
      let remoteFileIsVideo = false;
      for (let extension of this.videoFileExtensions) {
        if (remoteFile.toLowerCase().endsWith(extension)) {
          remoteFileIsVideo = true;
        }
      }
      if (remoteFileIsVideo) {
        this.startMediaDirectURL(remoteFile);
      } else if (remoteFile.toLowerCase().endsWith('.m3u8')) {
        this.startMediaM3U8(remoteFile);
      } else {
        if (this.$config.YTDLP_ENABLED) {
          await this.startMediaYTDLP(remoteFile);
        }
      }
    },
    startMediaDirectURL(remoteFile) {
      let remoteFilename = remoteFile.split('/')[remoteFile.split('/').length - 1];
      this.$root.mySocket.emit(
        "changeStream",
        this.$store.state.roomUUID,
        `${this.$config.BASE_URL}/api/remoteMedia/${this.$store.state.roomUUID}/${remoteFilename}/stream.m3u8?remoteFile=${remoteFile}`,
        false
      );
      this.remoteMediaVisible = false;

      let filenameWithoutExtension = remoteFilename.split('.');
      filenameWithoutExtension.pop();
      filenameWithoutExtension = filenameWithoutExtension.join('.');
      const mediaInfo = {
        Title: filenameWithoutExtension,
      }
      this.$root.mySocket.emit(
        "nowPlaying",
        this.$store.state.roomUUID,
        mediaInfo
      );
    },
    startMediaM3U8(remotePlaylist) {
      this.$root.mySocket.emit(
        "changeStream",
        this.$store.state.roomUUID,
        remotePlaylist,
        false
      );
      this.remoteMediaVisible = false;

      const mediaInfo = {
        Title: remotePlaylist,
      }
      this.$root.mySocket.emit(
        "nowPlaying",
        this.$store.state.roomUUID,
        mediaInfo
      );
    },
    async startMediaYTDLP(remotePage) {
      this.$root.mySocket.emit(
        "changeStream",
        this.$store.state.roomUUID,
        `${this.$config.BASE_URL}/api/ytdlp/${this.$store.state.roomUUID}/stream.m3u8?remotePage=${remotePage}`,
        false
      );
      this.remoteMediaVisible = false;

      let mediaInfo = {
        Title: remotePage,
      }
      const res = await this.$axios.get(`${this.$config.BASE_URL}/api/ytdlp/${this.$store.state.roomUUID}/MediaInfo`);
      if (!res.data.Error) {
        mediaInfo = res.data;
      }
      this.$root.mySocket.emit(
        "nowPlaying",
        this.$store.state.roomUUID,
        mediaInfo
      );
      if (mediaInfo.Poster !== undefined) {
        this.$root.mySocket.emit(
          "setPoster",
          this.$store.state.roomUUID,
          mediaInfo.Poster
        );
      }
    },
  }
}
</script>