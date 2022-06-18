<template>
  <v-expand-transition>
    <v-card style="position: absolute; right: 0; left: 0; z-index: 1;">
      <v-card-title>
    <v-btn
      icon
      target="_blank"
      href="https://github.com/WeekendWarrior1/Radium"
    >
      <v-icon>mdi-github
      </v-icon>
    </v-btn>
          Radium
      </v-card-title>

      <v-spacer></v-spacer>

      <v-card-text>
        Synced video playback with webtorrent-p2p assisted distribution of HLS segments.
      </v-card-text>

      <v-card-text>
          Version: {{ version }}
        <div>
          <a
            href="https://github.com/WeekendWarrior1/Radium/releases"
            target="_blank"
            class="has-text-success"
          >Changelog</a>
        </div>
      </v-card-text>

      <v-card-text>
        <div>
          Originally developed by
          <a href="https://github.com/Zibbp" target="_blank">
            Zibbp
          </a>
        </div>
        <div>
          Forked by
          <a href="https://github.com/WeekendWarrior1" target="_blank">
            WeekendWarrior1
          </a>
        </div>
      </v-card-text>

      <v-card-text v-if="segmentsReceivedCount">
        <div>
          Segments Received:
        </div>
        <div>
          Server: {{ segmentsReceivedCount.server }}
        </div>
        <div>
          Peers: {{ segmentsReceivedCount.peers }}
        </div>
        <div>
          Segments Delivered: {{ segmentsReceivedCount.served }}
        </div>
      </v-card-text>


        



      <!-- <div>
        <div class="card has-background-dark has-text-light">
          <div class="card-content ">
            <div class="media">
              <div class="media-content">
                <p class="title is-4 has-text-light	">Radium</p>
                <p class="subtitle is-6 has-text-light">
                  <a
                    href="https://github.com/WeekendWarrior1/radium"
                    class="has-text-success"
                    target="_blank"
                    >Github</a
                  >
                </p>
              </div>
            </div>

            <div class="content">
              Synced video playback with webtorrent-p2p assisted distribution of HLS segments.
              
              <br /><br />
              <code>Version {{ version }}</code
              ><br />
              <a
                href="https://github.com/WeekendWarrior1/Radium/releases"
                target="_blank"
                class="has-text-success"
                >Changelog</a
              >
              <br /><br />
              <p class="subtitle is-6 has-text-light ">
                Originally developed by
                <span class="has-text-weight-bold has-text-info">
                  <a href="https://github.com/Zibbp" target="_blank">
                    Zibbp
                  </a>
                </span>
                , forked by 
                <span class="has-text-weight-bold has-text-info">
                  <a href="https://github.com/WeekendWarrior1" target="_blank">
                    WeekendWarrior1
                  </a>
                </span>
              </p>
              <a
                class="button is-dark is-small"
                href="https://github.com/WeekendWarrior1"
                target="_blank"
              >
                <div v-if="segmentsReceivedCount">
                  <div>
                    Segments Received:
                  </div>
                  <div>
                    Server: {{ segmentsReceivedCount.server }}
                  </div>
                  <div>
                    Peers: {{ segmentsReceivedCount.peers }}
                  </div>
                  <div>
                    Segments Delivered: {{ segmentsReceivedCount.served }}
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div> -->
    </v-card>
  </v-expand-transition>
</template>

<script>
export default {
  props: ["segmentsReceivedCount"],
  data() {
    return {
      version: null
    };
  },
  mounted() {
    var pckg = require("../package.json");
    this.version = pckg.version;
  }
};
</script>