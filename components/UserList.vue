<template>
  <v-expand-transition>
    <v-card style="position: absolute; right: 0; left: 0; z-index: 1;">
      <div class="text-center">
        <v-chip-group style="margin-left: 8px; margin-right: 8px">
          <v-chip
            v-for="user in userList"
            :key="user.id"
            color="user.color"
            class="ma-2"
            >{{ user.username }}</v-chip
          >
        </v-chip-group>
      </div>
    </v-card>
  </v-expand-transition>
</template>

<script>
// import Info from "./Info";
export default {
  props: ["userList"],
  data() {
    return {
    };
  },
};
</script>