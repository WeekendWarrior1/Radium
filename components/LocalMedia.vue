<template>
  <v-expand-transition>
    <v-card v-if="mediaVisible" style="position: absolute; right: 0; left: 0; z-index: 1;">
      <v-container fluid >
        <v-row justify="left">
          <v-slide-group
            multiple
            show-arrows
            ref="slideGroupFiles"
          >
            <v-slide-item v-for="file in media" v-bind:key="file.filename" class="pa-1" elevation="3">
              <v-card v-if="file.filetype === 'isDirectory'"
                v-on:click="enterDirectory(file)"
                class="pa-2 darken-1"
                elevation="6"
                max-width="160"
              >
                <v-img height="144px" width="144px" src="/folder.png"/></v-img>
                <v-card-text>{{ file.filename }}</v-card-text>
              </v-card>
              <v-card v-else
                v-on:click="startMedia(file)"
                class="pa-2 darken-1"
                elevation="6"
                max-width="160"
              >
                <v-img 
                  height="144px"
                  width="144px"
                  lazy-src="/video-x-generic.png"
                  v-bind:src="`${$config.BASE_URL}/api/thumbs/${file.filename}.jpg${currentDirectory ? `?directory=${currentDirectory}` : '' }`">
                </v-img>
                <v-card-text>{{ file.filename }}</v-card-text>
              </v-card>
            </v-slide-item>
          </v-slide-group>
        </v-row>
      </v-container>
    </v-card>
  </v-expand-transition>
</template>

<script>
export default {
  data() {
    return {
      mediaVisible: false,
      currentDirectory: '',
      media: [],
    };
  },
  mounted() {
    this.$nuxt.$on("localMediaToggle", async () => {
      if (!this.mediaVisible) {
        this.media = await this.getFiles(this.currentDirectory);
        this.mediaVisible = true;
        setTimeout(() => {
          this.$refs.slideGroupFiles.setWidths();
        }, 500);
      } else {
        this.mediaVisible = false;
      }
    });
  },
  methods: {
    async getFiles(directory) {
      const res = await this.$axios.get(
        `${this.$config.BASE_URL}/api/localfs/${(directory) ? `?directory=${directory}` : ''}`
      );

      if (res.data.Error) {
        $nuxt.$emit("stopLoading");
        this.$buefy.toast.open({
          duration: 2000,
          message: `${res.data.Error}`,
          position: "is-bottom",
          type: "is-danger",
        });
        return {};
      } else {
        console.log(res.data);
        return res.data;
      }
    },
    async enterDirectory(file) {
      console.log('enterDirectory(file)', file);
      if (file.filename == '..') {
        let dirSplit = this.currentDirectory.split('/');
        dirSplit.pop();
        dirSplit.pop();
        this.currentDirectory = (dirSplit.length === 1) ? 
          dirSplit[0] + '/' :
          dirSplit.join('/') ;
      } else {
        this.currentDirectory += `${file.filename}/`;
      }
      this.media = await this.getFiles(this.currentDirectory);
    },
    async startMedia(file) {
      this.$root.mySocket.emit(
        "changeStream",
        this.$store.state.roomUUID,
        `${this.$config.BASE_URL}/api/localfs/${this.$store.state.roomUUID}/${file.filename}/stream.m3u8${(this.currentDirectory !== '') ? `?directory=${this.currentDirectory}` : ''}`,
        `${this.$config.BASE_URL}/api/thumbs/${file.filename}.jpg${this.currentDirectory ? `?directory=${this.currentDirectory}` : '' }`
      );
      this.mediaVisible = false;

      let filenameWithoutExtension = file.filename.split('.');
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
  }
}
</script>