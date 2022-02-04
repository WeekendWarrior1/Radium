<template>
  <div>
    <ul>
      <li><a v-on:click="createRoom()"> Create Room</a></li>
      <br />
      <li v-for="(room, roomUUID) in rooms" :key="roomUUID">
        <NuxtLink v-bind:to="`/room/${roomUUID}`">{{ roomUUID }}</NuxtLink>
        <div class="movie">
          <div>Users: {{ room.users }}</div>
          <div>roomHlsUrl: {{ room.roomHlsUrl }}</div>
          <div>roomPlaying: {{ room.roomPlaying }}</div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  layout: "player_layout",
  // layout: "landing",
  data() {
    return {
      rooms: {},
    };
  },
  async fetch() {
    this.rooms = await this.getRooms();
  },
  async mounted() {
    this.$root.mySocket.on("roomsUpdated", async (roomsCache) => {
      this.rooms = roomsCache;
    });
  },
  methods: {
    async getRooms() {
      let res = await this.$axios.$get(`${this.$config.BASE_URL}/api/rooms`);
      return res;
    },
    async createRoom() {
      let res = await this.$axios.$post(`${this.$config.BASE_URL}/api/rooms`);
      this.$root.mySocket.emit("newRoomCreated");
      this.$router.push(`/room/${res.UUID}`);
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