<template>
  <v-col cols="12" sm="12" md="6" lg="4" xl="3">
    <!-- <v-card class="pa-2" tile outlined dark elevation="2"> -->
    <v-card class="pa-1" elevation="3">
      <NuxtLink v-bind:to="`/room/${roomUUID}`">
        <v-card-title v-if="room.roomPlaying"
          style="word-wrap: normal;"
          >{{
            room.roomPlaying.SeriesName
              ? `${room.roomPlaying.SeriesName} - `
              : ""
          }}{{ room.roomPlaying.Title }}
        </v-card-title>
        <v-img v-if="room.posterUrl" lazy-src="/radium_poster.png" v-bind:src="room.posterUrl"> </v-img>
        <v-img v-else height="250" src="/radium_poster.png"> </v-img>
        <v-progress-linear
          v-if="room.currentTime"
          color="error"
          :value="(room.currentTime / room.roomPlaying.totalRuntimeMS) * 100"
        ></v-progress-linear>
      </NuxtLink>

      <v-card-actions>
        <v-btn
          v-if="room.users.length == 0"
          icon 
          @click="deleteRoom(roomUUID)"
        >
          <v-icon>mdi-delete-outline</v-icon>
        </v-btn>

        <v-btn color="orange lighten-2" text>
          Users: {{ room.users.length }}
        </v-btn>

        <v-spacer></v-spacer>

        <v-btn
          v-if="room.roomPlaying"
          icon
          @click="showExtendedMediaInfo = !showExtendedMediaInfo"
        >
          <v-icon>{{
            showExtendedMediaInfo ? "mdi-chevron-up" : "mdi-chevron-down"
          }}</v-icon>
        </v-btn>
      </v-card-actions>
      <div class="text-center">
        <v-chip-group
          v-if="room.roomPlaying === null"
          style="margin-left: 8px; margin-right: 8px"
        >
          <v-chip
            v-for="user in room.users"
            :key="user.id"
            color="user.color"
            class="ma-2"
            >{{ user.username }}</v-chip
          >
        </v-chip-group>
      </div>

      <v-expand-transition v-if="room.roomPlaying">
        <div v-show="showExtendedMediaInfo">
          <div class="text-center">
            <v-chip-group style="margin-left: 8px; margin-right: 8px">
              <v-chip
                v-for="user in room.users"
                :key="user.id"
                color="user.color"
                class="ma-2"
                >{{ user.username }}</v-chip
              >
            </v-chip-group>
          </div>
          <!-- <v-divider></v-divider> -->

          <v-card-text>
            <p>
              {{ room.roomPlaying.Runtime }}
            </p>
            <p v-if="room.roomPlaying.imdbRating" style="color: #ffd700">
              IMDb Rating
              <b-icon icon="star" size="is-small"></b-icon>
              {{ room.roomPlaying.imdbRating }} / 10
            </p>
            <p>{{ room.roomPlaying.Year }}</p>
            {{ room.roomPlaying.Plot }}
          </v-card-text>
        </div>
      </v-expand-transition>
      <!-- {{ room }} {{ roomUUID }} -->
    </v-card>
  </v-col>
</template>


<script>
export default {
  props: ["room", "roomUUID"],
  data: () => ({
    showExtendedMediaInfo: false,
  }),
  methods: {
    async deleteRoom(roomUUID) {
      await this.$axios.$delete(`${this.$config.BASE_URL}/api/rooms/${roomUUID}`);
      this.$root.mySocket.emit("roomDeleted");
    },
  }
};
</script>
