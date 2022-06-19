<template>
  <!-- <div class="chat-panel">
    <div class="message-panel" id="message-panel">
      <div class="messages" v-for="item in chat" :key="item.id">
        <b-icon
          v-if="item.user.admin"
          icon="cog"
          size="is-small"
          class="admin-icon"
          type="is-light"
        >
        </b-icon
        ><span :style="{ color: item.user.color }" class="has-text-weight-bold"
          >{{ item.user.username }} </span
        ><span>:&nbsp;</span>
        <div class="html-message" v-html="item.message" />
      </div>
    </div>
    <div class="input-panel">
      <form class="input-form">
        <input class="input is-dark" v-model="message" type="text" />
        <button class="button is-dark" @click.prevent="sendMessage">
          Chat
        </button>
      </form>
    </div>
    <b-modal :active.sync="helpModal" :destroy-on-hide="true" scroll="keep">
      <Help />
    </b-modal>
    <b-modal :active.sync="emoteModal" :destroy-on-hide="true" scroll="keep">
      <Emotes />
    </b-modal>
  </div> -->

  <v-navigation-drawer app
    clipped
    right
    v-if="this.$store.state.chat"
  >
  <!-- <v-navigation-drawer app
    clipped
    right
    width="17.2%"
  > -->
    <div class="message-panel" id="message-panel">
      <div class="messages" v-for="item in chat" :key="item.id">
        <b-icon
          v-if="item.user.admin"
          icon="cog"
          size="is-small"
          class="admin-icon"
          type="is-light"
        >
        </b-icon
        ><span :style="{ color: item.user.color }" class="has-text-weight-bold"
          >{{ item.user.username }} </span
        ><span>:&nbsp;</span>
        <div class="html-message" v-html="item.message" />
      </div>
      <v-footer
        absolute
        class="pa-0"
      >
        <!-- <v-form> -->
          <!-- <v-text-field
            class="pa-1"
            v-model="message"
            append-outer-icon="mdi-send"
            solo
            single-line
            hide-details
            type="text"
            v-on:keyup.enter="sendMessage"
            @click:append-outer="sendMessage"
          ></v-text-field> -->
          <!-- TODO shift enter should newline, enter should submit -->
          <v-textarea
            class="pa-2"
            solo
            type="text"
            auto-grow
            hide-details
            rows="1"

            v-model="message"
            append-outer-icon="mdi-send"
            v-on:keyup.enter.exact="sendMessage"
            @click:append-outer="sendMessage"
          >
          </v-textarea>
        <!-- </v-form> -->
      </v-footer>

    </div>
    <!-- <div class="input-panel">
      <form class="input-form">
        <input class="input is-dark" v-model="message" type="text" />
        <button class="button is-dark" @click.prevent="sendMessage">
          Chat
        </button>
      </form>
    </div> -->

    <b-modal :active.sync="helpModal" :destroy-on-hide="true" scroll="keep">
      <Help />
    </b-modal>
    <b-modal :active.sync="emoteModal" :destroy-on-hide="true" scroll="keep">
      <Emotes />
    </b-modal>
  </v-navigation-drawer>
</template>

<script>
import Help from "./Help";
import Emotes from "./Emotes";
export default {
  data() {
    return {
      chat: [],
      message: "",
      helpModal: false,
      emoteModal: false
    };
  },
  mounted() {
    this.$root.mySocket.on("setRoomMessages", (messages) => {
      console.log(`this.$nuxt.$on("setRoomMessages", (messages) => {`, messages);
      this.chat = messages;
      this.$nextTick(() => {
        this.setScrollToEnd();
      });
    });
    // this.$nuxt.$on("setRoomMessages", (messages) => {
    //   console.log(`this.$nuxt.$on("setRoomMessages", (messages) => {`, messages);
    //   this.chat = messages;
    //   this.$nextTick(() => {
    //     this.setScrollToEnd();
    //   });
    // });
    this.$root.mySocket.on("sendMessage", message => {
      this.chat.push(message);
      this.$nextTick(() => {
        this.setScrollToEnd();
      });
    });
  },
  beforeDestroy() {
    this.$root.mySocket.off("sendMessage");
    this.$root.mySocket.off("setRoomMessages");
  },
  methods: {
    setScrollToEnd() {
      const element = document.getElementById("message-panel");
      element.scrollTop = element.offsetHeight + element.scrollHeight;
    },
    async sendMessage() {
      console.log(this.message, this.message == "/emotes")
      // parse message for commands and emotes
      switch (this.message) {
        case "":
          this.message = "";
          break;
        case "/help":
          this.helpModal = true;
          this.message = "";
          break;
        case "/emotes":
        console.log('case "/emotes":',)
          this.emoteModal = true;
          this.message = "";
          break;
        default:
          if (this.message.substring(0, 5) == "/auth") {
            var code = this.message.substring(6);
            if (!code) {
              this.message = "";
              this.$buefy.toast.open({
                duration: 1000,
                message: `Enter a Code`,
                position: "is-top",
                type: "is-danger"
              });
            } else {
              try {
                var res = await this.$axios.get(
                  `${this.$config.BASE_URL}/api/auth/${code}`
                );
                this.$buefy.toast.open({
                  duration: 1000,
                  message: `Authenticated`,
                  position: "is-top",
                  type: "is-success"
                });
                this.$store.commit("isAdmin");
                this.$root.mySocket.emit("setAdmin", this.$store.state.user);
                this.message = "";
              } catch (error) {
                this.$buefy.toast.open({
                  duration: 1000,
                  message: `Incorrect Code`,
                  position: "is-top",
                  type: "is-danger"
                });
                this.message = "";
              }
            }
          } else {
            const stringArr = this.message.split(" ");
            const result = stringArr
              .map(word =>
                this.$store.state.emotes[word]
                  ? this.$store.state.emotes[word]
                  : word
              )
              .join(" ");
            var message = {
              message: result,
              user: this.$store.state.user
            };
            this.$root.mySocket.emit("message", this.$store.state.roomUUID, message);
            this.message = "";
          }
      }
    }
  }
};
</script>

<style>
.chat-panel {
  /* height: calc(100vh - 4rem); */
  height: calc(100vh);
}
.message-panel {
  height: 95%;
  background-color: #252525;
  overflow-y: scroll;
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

.message-panel::-webkit-scrollbar {
  display: none;
}
.input-panel {
  height: 5%;
  background-color: #252525;
}
.input-form {
  display: flex;
  height: 100%;
}
.input-form .input {
  border-radius: 0px;
  background-color: #414141;
  border-color: #414141;
  color: hsl(0, 0%, 86%);
}
.input-form .button {
  border-radius: 0px;
}

.messages {
  color: #d3d3d3;
  display: flex;
  padding-left: 0.5rem;
  padding-bottom: 0.5rem;
  padding-right: 0.5rem;
}
.html-message {
  word-break: break-word;
}
.admin-icon {
  margin-top: 0.25rem;
  margin-right: 0.2rem;
}

@media screen and (min-width: 992px) {
  .input-form .input {
    height: 100%;
  }
  .input-form .button {
    height: 100%;
  }
}
</style>
