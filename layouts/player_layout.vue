<template>
  <v-app app>
    <Navbar />
    <!-- <Chat v-if="$nuxt.$route.name != 'index' && this.$store.state.chat && $config.PROTECT && $store.state.authorized" /> -->
    <!-- <Chat v-if="$nuxt.$route.name != 'index' && this.$store.state.chat && !$config.PROTECT" /> -->
    <Chat v-if="$nuxt.$route.name != 'index' && !$config.PROTECT" />
    <v-main>
      <nuxt />
    </v-main>


    <!-- <v-footer
      app
      v-if="$nuxt.$route.name === 'index'"
      color="transparent"
      height="72"
      inset
    >
      <v-text-field
        background-color="grey lighten-1"
        dense
        flat
        hide-details
        rounded
        solo
      ></v-text-field>
    </v-footer> -->

  </v-app>

  <!-- <v-sheet dark>
    <Navbar />
    <nuxt />
  </v-sheet> -->
</template>

<script>
import Navbar from "../components/Navbar";
import Chat from "../components/Chat";
export default {};
</script>

<style>
/* @import url("https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css");

html {
  background-color: #252525;
}

body::-webkit-scrollbar {
  width: 10px;
  background-color: #555555;
}
body::-webkit-scrollbar-track {
  background-color: #555555;
}
body::-webkit-scrollbar-thumb {
  background-color: #000000;
  border: 0px solid #555555;
}
* {
  scrollbar-color: #000000 #555555;
} */
</style>
