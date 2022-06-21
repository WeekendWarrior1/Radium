<template>
  <div class="player">
    <Playing />
    <UserList
      v-if="userListOpen"
      :userList="users"
    />
    <RadiumInfo
      v-if="radiumInfoOpen"
      :segmentsReceivedCount="segmentsReceivedCount"
    />
    <Jellyfin v-if="this.$config.JELLYFIN_ENABLED"/>
    <LocalMedia v-if="this.$config.LOCAL_MEDIA_DIRECTORY"/>
    <RemoteMedia v-if="this.$config.REMOTE_MEDIA_ENABLED"/>
    <video
      id="video"
      ref="videoPlayer"
      class="video-js vjs-radium-theme"
      preload="auto"
      crossorigin="anonymous"
    >
          <!-- poster="/radium_poster.png" -->

      <!-- <track kind="captions" :src="subtitleUrl" srclang="en" label="default" /> -->
    </video>
  </div>
</template>

<script>
import Playing from "../components/Playing";
import UserList from "../components/UserList.vue";
import RadiumInfo from "../components/RadiumInfo.vue";
import Jellyfin from "../components/Jellyfin.vue";
import LocalMedia from "../components/LocalMedia.vue";
import RemoteMedia from "../components/RemoteMedia.vue";

export default {
  // head() {
  //   return {
  //     script: [
  //       {
  //         src: "https://cdn.jsdelivr.net/npm/p2p-media-loader-core@latest/build/p2p-media-loader-core.min.js",
  //       },
  //       {
  //         src: "https://cdn.jsdelivr.net/npm/p2p-media-loader-hlsjs@latest/build/p2p-media-loader-hlsjs.min.js",
  //         // src: "https://cdn.jsdelivr.net/npm/p2p-media-loader-hlsjs@latest/build/p2p-media-loader-hlsjs.js",
  //       },
  //       // {
  //       //   src: "https://cdn.jsdelivr.net/npm/hls.js@latest"
  //       // },
  //       {
  //         //16 seems to be latest that p2p works with contrib-hls
  //         // src: "https://vjs.zencdn.net/7.16.0/video.min.js",
  //         // src: "https://vjs.zencdn.net/7.17.0/video.min.js",
  //         src: "/video.min.js",
  //       },
  //       {
  //         // 0.8.9 ?
  //         // src: "https://cdn.jsdelivr.net/npm/videojs-contrib-hls.js@latest",
  //         // src: "https://cdn.streamroot.io/videojs-hlsjs-plugin/1/stable/videojs-hlsjs-plugin.js",
  //         src: "/videojs-hlsjs-plugin.js"
  //       },
  //     ],
  //   };
  // },
  data() {
    return {
      player: null,
      // subtitleUrl: `${this.$config.BASE_URL}/subs.vtt`,
      engine: null,
      syncTimer: null,

      userListOpen: false,
      users: [],

      radiumInfoOpen: false,
      jellyfinVisible: false,

      // keep track of how many segments were served from server vs p2p for debug purposes
      segmentsReceivedCount: {
        'server': 0,
        'peers': 0,
        'served': 0,
      },
      
      dvdBounceActive: true,
      dvdBouncerInterval: null,
      playerResizeObserver: null,
      dvdSVGLogo: null,
      dvdXpos: 10,
      dvdYpos: 10,
      dvdXSpeed: 4,
      dvdYSpeed: 4,
      dvdFPS: 60,
    };
  },
  mounted() {
    const config = {
      loader: {
        trackerAnnounce: this.$config.WEBTORRENT_TRACKER_ENABLED
          ? [`${this.$config.WEBTORRENT_BASE_URL}`]
          : ["wss://tracker.novage.com.ua", "wss://tracker.openwebtorrent.com"],
      },
    };
    this.engine = new p2pml.hlsjs.Engine(config);

    let playerOptions = {
      autoplay: false,
      controls: true,
      liveui: true,
      textTrackSettings: true, // TODO change to false when finished messing with subs
      html5: {
        // vhs: {   // doesn't support p2p
        //   overrideNative: false,
        hlsjsConfig: {
          liveSyncDurationCount: 7, // To have at least 7 segments in queue
          // loader: engine.createLoaderClass(),
          loader: this.engine.createLoaderClass(),
        },
      },
      sources: [
        // {
        //   // src: this.$config.HLS_URL,
        //   src: "http://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8",
        //   type: "application/x-mpegURL",
        // },
      ],
    };

    // Initialize player
    this.player = videojs(
      this.$refs.videoPlayer,
      playerOptions
      // this.player.ready(function () {

      // }),
      // function onPlayerReady() {
      //   console.log("ON PLAYER READY");
      //   // let settings = new TextTrackSettings(this.player, playerOptions);

      //   let settings = this.player.textTrackSettings;
      //   // settings.backgroundColor = "#000";
      //   // settings.backgroundOpacity = "0";
      //   // settings.edgeStyle = "uniform";

      //   settings.setValues({
      //     backgroundColor: "#000",
      //     backgroundOpacity: "0",
      //     edgeStyle: "uniform",
      //   });
      //   settings.updateDisplay();
      // }
    );
    // this.player.on("ready", (event) => {
    //   console.log("ON PLAYER READY", this.player.TextTrackSettings.getValues());

    //   let settings = this.player.TextTrackSettings;
    //   settings.setValues({
    //     backgroundColor: "#000",
    //     backgroundOpacity: "0",
    //     edgeStyle: "uniform",
    //   });
    //   settings.updateDisplay();
    // });

    //add play pause listener
    this.player.on("playButton", (event, time) => {
      this.$root.mySocket.emit("play", this.$store.state.roomUUID, time);
    });

    this.player.on("pauseButton", (event, time) => {
      this.$root.mySocket.emit("pause", this.$store.state.roomUUID, time);
    });

    this.player.on("seekBar", (event, time) => {
      this.$root.mySocket.emit("sync", this.$store.state.roomUUID, time);
      // if buffering, have to wait for chunk to finish and then sync again


      // if seeked a second time whilst this timer is still pending, clear it
      clearTimeout(this.syncTimer);
      this.syncTimer = setTimeout(function () {
        // seems this.$root becomes this.$nuxt.$root in this scope
        this.$nuxt.$root.mySocket.emit("sync", this.$nuxt.$store.state.roomUUID, videojs(document.getElementById('video')).currentTime());
      }, 5000);
    });

    // p2pml.hlsjs.initVideoJsContribHlsJsPlayer(this.player);
    p2pml.hlsjs.initVideoJsHlsJsPlugin();

    // this.engine.on("peer_connect", (peer) => console.log("peer_connect", peer));
    // this.engine.on("peer_close", (peerId) => console.log("peer_close", peerId));
    this.engine.on("segment_loaded", (segment, peerId) => {
      // console.log(
      //   "segment_loaded from",
      //   peerId ? `peer ${peerId}` : "HTTP",
      //   segment.url
      // )
      this.segmentsReceivedCount[peerId ? 'peers' : 'server'] += 1;
      // console.log(`${peerId ? 'peers' : 'server'}: `,this.segmentsReceivedCount[peerId ? 'peers' : 'server']);
    });

    this.engine.on("piece_bytes_uploaded", (segment, peerId) => {
      this.segmentsReceivedCount.served += 1;
    });


    // If Radium is running in protected mode, add a token to headers for authentication
    if (this.$config.PROTECT) {
      const token = this.$store.state.token;
      videojs.Hls.xhr.beforeRequest = function (options) {
        if (options.headers == undefined) {
          options.headers = {};
        }
        options.headers["x-auth-token"] = token;

        return options;
      };
    }

    this.player.volume(1);

    // Player state has been requested
    this.$root.mySocket.on("requestState", async (roomUUID, id) => {
      this.$root.mySocket.emit("sendState", roomUUID, {
        time: this.player.currentTime(),
        paused: this.player.paused(),
        id: id,
      });
      // wait 5 seconds and repeat a second time to ensure sync on buffered client
      await new Promise((resolve) => setTimeout(resolve, 5000));
      this.$root.mySocket.emit("sync", roomUUID, this.player.currentTime());
    });

    // Player state received from another Client
    this.$root.mySocket.on("setState", (state) => {
      // Set HLS stream
      if (state.roomHlsUrl) {
        this.player.src(state.roomHlsUrl);
      }
      // Set subtitles
      if (state.roomSubtitleUrl) {
        // Remove old subtitles
        setTimeout(() => {
          var oldTracks = this.player.remoteTextTracks();

          var i = oldTracks.length;

          while (i--) {
            this.player.removeRemoteTextTrack(oldTracks[i]);
          }
        }, 1000);
        // Add new subtitle
        setTimeout(() => {
          this.player.addRemoteTextTrack(
            {
              kind: "captions",
              src: state.roomSubtitleUrl,
              srclang: "en",
              label: "custom",
              default: true,
            },
            true
          );
        }, 1500);
      }
      // Set time
      if (state.roomTime) {
        this.player.currentTime(state.roomTime);
      }
      // Set player state
      if (state.roomPaused == true) {
        this.player.pause();
      } else {
        this.player.play();
      }
      // Set Now Playing
      if (state.roomPlaying) {
        $nuxt.$emit("setPlaying", state.roomPlaying);
      }
    });

    // Change HLS Stream
    this.$root.mySocket.on("setStream", (url) => {
      // console.log("before", this.player.remoteTextTracks().tracks_);
      // let oldTracks = this.player.remoteTextTracks().tracks_;

      // for (let i in oldTracks) {
      //   console.log(i);
      //   this.player.removeRemoteTextTrack(oldTracks[i]);
      // }

      // // var i = oldTracks.length;
      // console.log("oldTracks",oldTracks);

      // // while (i--) {
      // //   this.player.removeRemoteTextTrack(oldTracks[i]);
      // // }
      // for (let i in oldTracks) {
      //   console.log(i);
      //   this.player.removeRemoteTextTrack(oldTracks[i]);
      // }
      // this.player.remoteTextTracks().tracks_ = [];
      // console.log('textTracks',this.player.textTracks());
      // console.log('remoteTextTrackEls',this.player.remoteTextTrackEls().trackElements_);
      // console.log('remoteTextTracks',this.player.remoteTextTracks());
      // let oldTracks = this.player.remoteTextTrackEls().trackElements_;
      // let oldTracks = this.player.remoteTextTrackEls();
      // let oldTracks = this.player.remoteTextTracks().tracks_;
      // for (let track of oldTracks) {
      //   // this.player.removeRemoteTextTrack(track);
      //   // oldTracks.removeTrack(track);
      // }

      // this.player.src(url);
      this.player.src({ type: "application/vnd.apple.mpegurl", src: url });
      // console.log('attempt to access tech',this.player.tech());
      // this.player.ready(function() {
      //   console.log('test ready listener on source change',tech);
      //   // tech() will log warning without any argument
      //   // var tech = myPlayer.tech(false);
      // });
      // this.player.tech()._updateTextTrackList();
      //   this.player.dispose();
      //   playerOptions.sources = [
      //     {
      //       src: url,
      //       type: "application/vnd.apple.mpegurl",
      //     },
      //   ],

      // this.player = videojs(
      //   this.$refs.videoPlayer,
      //   playerOptions
      // );
      // p2pml.hlsjs.initVideoJsHlsJsPlugin();

      // console.log("after", this.player.remoteTextTrackEls());
      // Toast notification
      this.$buefy.toast.open({
        duration: 2000,
        message: `Changed HLS Stream`,
        position: "is-bottom",
        type: "is-success",
      });
    });

    // change subtitles
    this.$root.mySocket.on("setSubtitles", (url) => {
      // Remove old subtitles
      setTimeout(() => {
        var oldTracks = this.player.remoteTextTracks();

        var i = oldTracks.length;

        while (i--) {
          this.player.removeRemoteTextTrack(oldTracks[i]);
        }
      }, 1000);
      // Add new subtitle
      setTimeout(() => {
        this.player.addRemoteTextTrack(
          {
            kind: "captions",
            src: url,
            srclang: "en",
            label: "custom",
            default: true,
          },
          true
        );
      }, 1500);

      // Toast notification
      this.$buefy.toast.open({
        duration: 2000,
        message: `Changed Subtitles`,
        position: "is-bottom",
        type: "is-success",
      });
    });

    // on serverPlay
    this.$root.mySocket.on("serverPlay", (time) => {
      if (this.player.paused()) {
        //sync then play
        // this.player.currentTime(time);
        this.player.play();
        this.$buefy.toast.open({
          duration: 500,
          message: `Play`,
          position: "is-bottom",
        });
      }
    });

    // on serverPause
    this.$root.mySocket.on("serverPause", (time) => {
      if (!this.player.paused()) {
        // pause then sync
        this.player.pause();
        this.player.currentTime(time);
        this.$buefy.toast.open({
          duration: 500,
          message: `Pause`,
          position: "is-bottom",
        });
      }
    });

    // on sendSync from server
    this.$root.mySocket.on("serverSync", (currentTime) => {
      this.player.currentTime(currentTime);
    });

    // on setPoster from stream
    this.$root.mySocket.on("setPoster", (url) => {
      this.destroyDVDBouncer();
      this.player.poster(url);
    });

    // user list component
    this.$nuxt.$on("showUserList", (listVisible) => {
      this.userListOpen = listVisible;
    });
    this.$root.mySocket.on("userList", (roomUUID, users) => {
        this.users = users;
    });

    // radium info component
    this.$nuxt.$on("showRadiumInfo", () => {
      if (this.jellyfinVisible && !this.radiumInfoOpen) {
        $nuxt.$emit("hideJellyfin");
      }
      this.radiumInfoOpen = !this.radiumInfoOpen;
    });

    this.$nuxt.$on("jellyfinSearchState", (jellyfinVisible) => {
      this.jellyfinVisible = jellyfinVisible;
    });

    // default poster of bouncing dvd logo lol
    // https://codepen.io/Web_Cifar/pen/JjXrLRJ
    this.buildDvdSVGLogo();
    let vjsPoster = document.getElementsByClassName('vjs-poster vjs-hidden')[0];
    vjsPoster.appendChild(this.dvdSVGLogo);
    vjsPoster.classList.remove("vjs-hidden");

    this.dvdBouncerInterval = setInterval(this.checkForDvdBounce, 1000 / this.dvdFPS );

    this.playerResizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const cr = entry.contentRect;
        let logo = document.querySelector(".logo");
        if (this.dvdXpos + logo.clientWidth > cr.width) {
          this.dvdXpos = cr.width - logo.clientWidth;
        }
        if (this.dvdYpos + logo.clientHeight > cr.height) {
          this.dvdYpos = cr.height - logo.clientHeight;
        }
        if (this.dvdXpos < 0) {
          this.dvdXpos = 0;
        }
        if (this.dvdYpos < 0) {
          this.dvdYpos = 0;
        }
      }
    });
    this.playerResizeObserver.observe(this.$refs.videoPlayer);
  },
  async beforeDestroy() {
    this.destroyDVDBouncerListeners();

    if (this.player) {
      await this.player.dispose();
    }
    if (this.engine) {
      await this.engine.destroy();
    }

    //remove all socket listeners
    this.$root.mySocket.off("requestState");
    this.$root.mySocket.off("setState");
    this.$root.mySocket.off("setStream");
    this.$root.mySocket.off("setSubtitles");
    this.$root.mySocket.off("serverPlay");
    this.$root.mySocket.off("serverPause");
    this.$root.mySocket.off("serverSync");
    this.$root.mySocket.off("setPoster");
    this.$root.mySocket.off("userList");
    this.$root.mySocket.off("showRadiumInfo");
  },
  methods: {
    checkForDvdBounce() {
      let logo = document.querySelector(".logo");
      if (this.dvdXpos + logo.clientWidth >= this.$refs.videoPlayer.clientWidth || this.dvdXpos <= 0) {
        this.dvdXSpeed = -this.dvdXSpeed;
        logo.style.fill = this.randomColour();
      }
      if (this.dvdYpos + logo.clientHeight >= this.$refs.videoPlayer.clientHeight || this.dvdYpos <= 0) {
        this.dvdYSpeed = -this.dvdYSpeed;
        logo.style.fill = this.randomColour();
      }

      this.dvdXpos += this.dvdXSpeed;
      this.dvdYpos += this.dvdYSpeed;
      this.updateDvdPosition(logo);
    },
    buildDvdSVGLogo() {
      this.dvdSVGLogo = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.dvdSVGLogo.classList.add('logo');
      // this.dvdSVGLogo.setAttribute('id', 'logo');
      this.dvdSVGLogo.setAttribute('viewbox', '0 0 16 8');
      this.dvdSVGLogo.setAttribute('fill', 'none');
      this.dvdSVGLogo.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");

      let path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
      path.setAttribute('d', 'M7.4 4.959C3.268 4.959 0 5.509 0 6.186C0 6.864 3.268 7.413 7.4 7.413C11.532 7.413 14.943 6.864 14.943 6.186C14.944 5.508 11.533 4.959 7.4 4.959ZM7.263 6.51C6.306 6.51 5.53 6.273 5.53 5.98C5.53 5.687 6.306 5.45 7.263 5.45C8.22 5.45 8.995 5.687 8.995 5.98C8.995 6.273 8.219 6.51 7.263 6.51ZM13.319 0.052002H9.701L7.769 2.291L6.849 0.0830021H1.145L0.933 1.045H3.202C3.202 1.045 4.239 0.909002 4.273 1.739C4.273 3.177 1.897 3.055 1.897 3.055L2.341 1.555H0.869L0.194 3.988H2.862C2.862 3.988 5.683 3.738 5.683 1.77C5.683 1.77 5.797 1.196 5.749 0.943002L7.124 4.62L10.559 1.055H13.165C13.165 1.055 13.963 1.123 13.963 1.74C13.963 3.178 11.604 3.028 11.604 3.028L11.969 1.556H10.682L9.946 3.989H12.399C12.399 3.989 15.465 3.799 15.465 1.71C15.465 1.709 15.404 0.052002 13.319 0.052002Z');
      // scale is workaround of svg not filling viewbox, regardless (because of parent viewbox attr?)
      path.setAttribute('transform', "scale(13)");
      this.dvdSVGLogo.appendChild(path);
    },
    updateDvdPosition(logo) {
      logo.style.left = this.dvdXpos + "px";
      logo.style.top = this.dvdYpos + "px";
    },
    randomColour() {
      return `#${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
    },
    destroyDVDBouncer() {
      this.destroyDVDBouncerListeners();
      // remove elements
      let vjsPoster = document.getElementsByClassName('vjs-poster');
      if (vjsPoster.length && vjsPoster[0].querySelector('.logo')) {
        vjsPoster = vjsPoster[0];
        vjsPoster.removeChild(this.dvdSVGLogo);
        vjsPoster.classList.add("vjs-hidden");
      }    
    },
    destroyDVDBouncerListeners() {
      if (this.dvdBouncerInterval) {
        clearInterval(this.dvdBouncerInterval);
      }
      if (this.playerResizeObserver) {
        this.playerResizeObserver.disconnect();
      }
    }
  }
};
</script>

<style>
/* dvd bounce */
svg {
  position: absolute;
  width: 201px;
  height: 100px;
  fill: rgb(0, 81, 255);
}
/* @media (max-width: 768px) {
  svg {
    width: 150px;
  }
} */

.player {
  width: 100%;
  height: 100%;
  position: relative;
}
.video-js {
  height: 100% !important;
  width: 100%;
}
.video-js .video {
  height: 100% !important;
  width: 100%;
}
.video-js__captions .video-js__caption {
  font-size: 26px !important;
}
.video-js__captions {
  padding-bottom: 7vh;
}
.vjs-tech {
  pointer-events: none;
}
/* Custom Theme */
.vjs-radium-theme {
  --vjs-radium-theme--primary: #8ef311;
  --vjs-radium-theme--secondary: #fff;
}
.vjs-radium-theme .vjs-big-play-button {
  width: 2em;
  height: 2em;
  line-height: 1.9em;
  border-radius: 1em;
  left: calc(50% - 1em);
  top: calc(50% - 1em);
  backdrop-filter: blur(4px);
  background-color: rgba(0, 0, 0, 0.6);
  border: 2px solid var(--vjs-radium-theme--primary);
  color: var(--vjs-radium-theme--primary);
}
.vjs-radium-theme.vjs-big-play-button:focus,
.vjs-radium-theme:hover .vjs-big-play-button {
  color: var(--vjs-radium-theme--primary);
}
.vjs-radium-theme .vjs-control-bar {
  height: 54px;
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0.4) 35%,
    rgba(0, 0, 0, 0) 100%
  );
}
.vjs-radium-theme .vjs-button > .vjs-icon-placeholder:before,
.vjs-radium-theme .vjs-time-control {
  line-height: 54px;
}
.vjs-radium-theme .vjs-play-control {
  font-size: 1.5em;
  position: relative;
}
.vjs-radium-theme .vjs-volume-panel {
  order: 4;
  font-size: 1.6em;
  margin-left: -0.5em;
  margin-right: -0.9em;
}

.vjs-radium-theme .vjs-seek-to-live-control {
  margin-top: 1.1em !important;
}

.vjs-radium-theme .vjs-volume-bar {
  margin: 1.5em 0.45em;
}

.video-js .vjs-volume-level {
  background-color: var(--vjs-radium-theme--primary);
}

.vjs-theme-city
  .vjs-volume-panel:hover
  .vjs-volume-control.vjs-volume-horizontal {
  height: 100%;
}

.vjs-radium-theme .vjs-progress-holder .vjs-load-progress {
  background-color: #95c01f !important;
  transition: width 0.15s linear;
}

.vjs-radium-theme .vjs-progress-control .vjs-progress-holder,
.vjs-radium-theme .vjs-progress-control:hover .vjs-progress-holder {
  font-size: 1.5em;
}

.vjs-radium-theme .vjs-picture-in-picture-control {
  font-size: 1.4em;
}

.vjs-radium-theme .vjs-menu-button {
  font-size: 1.2em;
}

.vjs-radium-theme .vjs-play-control .vjs-icon-placeholder:before {
  height: 1.3em;
  width: 1.3em;
  margin-top: 0.2em;
  border-radius: 1em;
  border: 3px solid var(--vjs-radium-theme--secondary);
  top: 2px;
  left: 9px;
  line-height: 1.1;
}
.vjs-radium-theme .vjs-play-control:hover .vjs-icon-placeholder:before {
  border: 3px solid var(--vjs-radium-theme--secondary);
}
.vjs-radium-theme .vjs-play-progress,
.vjs-radium-theme .vjs-play-progress:before {
  background-color: var(--vjs-radium-theme--primary);
}
.vjs-radium-theme .vjs-play-progress:before {
  height: 0.8em;
  width: 0.8em;
  content: "";
  border: 4px solid var(--vjs-radium-theme--secondary);
  border-radius: 0.8em;
  top: -0.25em;
}
.vjs-radium-theme .vjs-progress-control {
  font-size: 14px;
}
.vjs-radium-theme .vjs-fullscreen-control {
  order: 6;
  font-size: 1.5em;
}
.vjs-radium-theme .vjs-remaining-time {
  font-size: 1.5em;
}
.vjs-radium-theme.nyan .vjs-play-progress {
  background: linear-gradient(
    180deg,
    #fe0000 0,
    #fe9a01 16.666666667%,
    #fe9a01 0,
    #ff0 33.332666667%,
    #ff0 0,
    #32ff00 49.999326667%,
    #32ff00 0,
    #0099fe 66.6659926%,
    #0099fe 0,
    #63f 83.33266%,
    #63f 0
  );
}
.vjs-radium-theme.nyan .vjs-play-progress:before {
  height: 1.3em;
  width: 1.3em;
  background: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 125' fill='%23fff'%3E%3Cpath d='M62.153 37.323h2.813v3.246h-2.813zM64.858 40.569h2.813v3.246h-2.813zM67.672 43.814h11.9v3.246h-11.9zM79.572 24.449h2.813v19.365h-2.813zM82.386 37.323h3.244v3.246h-3.244zM85.63 34.132h5.627v3.246H85.63zM91.257 37.323h2.92v12.95h-2.92zM94.177 50.274h2.922V66.21h-2.922zM91.29 66.372h2.887v3.245H91.29zM88.401 69.617h2.889v3.246h-2.889zM27.312 72.863h61.003v3.245H27.312zM73.622 76.108h2.889v3.246h-2.889zM82.563 76.108h2.888v3.246h-2.888zM76.511 79.354h6.053v3.245h-6.053zM61.941 79.354h8.895v3.245h-8.895zM67.947 76.108h2.889v3.246h-2.889zM59.321 76.108h2.888v3.246h-2.888zM27.312 17.917h49.387v3.246H27.312zM76.699 21.162h2.873v3.287h-2.873zM56.372 34.132h5.781v3.191h-5.781zM53.448 37.323h2.924v12.951h-2.924zM50.488 50.274h2.96v16.049h-2.96zM53.448 66.323h2.924v3.257h-2.924zM56.372 69.58h2.949v3.283h-2.949zM65.069 63.213h2.878v6.367h-2.878zM67.947 66.397h17.504v3.22H67.947z'/%3E%3Cpath d='M82.563 63.213h2.888v3.185h-2.888zM73.801 63.213h2.898v3.185h-2.898zM76.699 56.774h2.873v3.145h-2.873zM82.563 56.774h2.888v3.145h-2.888zM85.451 53.444h2.864v3.33h-2.864z'/%3E%3Cpath d='M85.451 56.774h2.864v3.145h-2.864zM65.069 53.444h2.878v3.33h-2.878zM65.069 56.774h2.878v3.145h-2.878zM62.209 56.774h2.86v3.145h-2.86zM21.509 24.327h2.813v45.169h-2.813zM24.323 21.162h2.99v3.165h-2.99zM18.562 69.496h8.75v3.367h-8.75zM15.656 72.863h2.906v9.591h-2.906zM18.562 79.301h8.75v3.153h-8.75zM24.323 76.108h5.743V79.3h-5.743zM33.136 76.108h2.824v6.346h-2.824zM35.96 79.281h5.813v3.173H35.96zM41.774 76.108h2.864v3.173h-2.864zM3.948 40.569h11.708v3.229H3.948zM3.948 43.814h2.921v6.459H3.948zM6.869 47.06h2.934v6.384H6.869zM9.803 50.274h2.909v6.5H9.803z'/%3E%3Cpath d='M12.711 53.444h2.945v6.475h-2.945zM15.656 56.774h5.853v3.145h-5.853z'/%3E%3Cpath d='M18.583 59.919h2.926v3.294h-2.926zM18.583 47.044h2.926v6.4h-2.926zM12.711 43.814h5.872v3.229h-5.872zM15.647 47.044h2.936v3.2h-2.936z'/%3E%3Cpath fill='none' d='M47.439 50.274h3.049v3.17h-3.049z'/%3E%3Cpath d='M73.801 30.94v-3.138h-2.965v-3.354l-37.7-.122v3.151h-3.07v3.462l-2.753-.108-.118 32.381h2.871v3.185h3.07v-3.185h2.824v3.185h-2.824v3.099l20.312.084v-3.257h-2.96V50.274h2.96V37.323h2.924v-3.191h5.781v3.191h2.813l-.108 3.246h2.813v3.246h9.027V30.94h-2.897zM33.136 56.682h-3.07v-3.158h3.07v3.158zm2.824-22.55h-2.824v-3.084h2.824v3.084zm2.907 12.928h2.907v3.184h-2.907V47.06zm5.771 16.153h-2.864v-3.294h2.864v3.294zm2.801-19.399h-2.801v-3.246h2.801v3.246zm6.009-12.766h-2.96v-3.354h2.96v3.354zm8.705 0h-2.832v-3.354h2.832v3.354zm8.683 6.275h-2.889v-3.191h2.889v3.191z'/%3E%3C/svg%3E")
    no-repeat;
  border: none;
  top: -0.35em;
}
</style>
