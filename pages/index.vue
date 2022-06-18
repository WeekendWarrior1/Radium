<template>
  <!-- <v-sheet id="scrolling-techniques-7" class="overflow-y-auto" max-height="1200"> -->
  <v-container
  >

    <RadiumInfo
      v-if="radiumInfoOpen"
      :segmentsReceivedCount="null"
    />
    <!-- <v-sheet id="scrolling-techniques-7" class="overflow-y-auto"> -->
    <!-- <v-sheet 
      style="height: 100%;"
    > -->
      <!-- <v-container> -->

      <div>
        <div style="padding: 15px 15px 0px 15px">
          <button class="button is-success" v-on:click="createRoom()">
            Create Room
          </button>
        </div>
        <br />
        <!-- <v-container class="grey lighten-5"> -->
        <!-- <v-container dark> -->
        <v-row>
          <RoomCard
            v-for="(room, roomUUID) in rooms"
            :key="roomUUID"
            :room="room"
            :roomUUID="roomUUID"
          ></RoomCard>
        </v-row>
      </div>
      <!-- </v-container> -->
    <!-- </v-sheet> -->
  </v-container>

  <!-- <div>
    <div style="padding: 15px 15px 0px 15px">
      <button class="button is-success" v-on:click="createRoom()">
        Create Room
      </button>
    </div>
    <br /> -->
  <!-- <v-container class="grey lighten-5"> -->
  <!-- <v-container dark>
      <v-row>
        <RoomCard
          v-for="(room, roomUUID) in rooms"
          :key="roomUUID"
          :room="room"
          :roomUUID="roomUUID"
        ></RoomCard>
      </v-row>
    </v-container>
  </div> -->
</template>


<script>
// import { v4 as uuidv4 } from "uuid";
import RoomCard from "../components/RoomCard";

export default {
  layout: "player_layout",
  // layout: "landing",
  data() {
    return {
      rooms: {},
      radiumInfoOpen: false,
    };
  },
  async fetch() {
    this.rooms = await this.getRooms();
  },
  async mounted() {
    this.$root.mySocket.on("roomsUpdated", async (roomsCache) => {
      this.rooms = roomsCache;
    });

    // radium info component
    // this.$nuxt.$on("showRadiumInfo", (infoVisible) => {
    //   this.radiumInfoOpen = infoVisible;
    this.$nuxt.$on("showRadiumInfo", () => {
      this.radiumInfoOpen = !this.radiumInfoOpen;
    });
  },
  beforeDestroy() {
    this.$root.mySocket.off("showRadiumInfo");
  },
  methods: {
    async getRooms() {
      let res = await this.$axios.$get(`${this.$config.BASE_URL}/api/rooms`);
      return res;
    },
    async createRoom() {
      // better to POST this and wait for the response than to send via socket, because we don't know when the server is done
      let res = await this.$axios.$post(`${this.$config.BASE_URL}/api/rooms`);
      this.$root.mySocket.emit("newRoomCreated");
      this.$router.push(`/room/${res.UUID}`);

      // const generatedUUID = uuidv4();
      // this.$root.mySocket.emit("createRoom", generatedUUID);
      // this.$router.push(`/room/${generatedUUID}`);
    },
  },
};
</script>


<style>
.movie {
  /* display: flex; */
  background-color: #18212e;
  padding: 15px 25px 15px 15px;
  font-family: "Open Sans", sans-serif;
}
</style>