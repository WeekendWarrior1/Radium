export const state = () => ({
  connected: false,
  chat: true,
  authorized: false,
  token: null,
  roomUUID: null,
  user: {
    username: null,
    color: null,
    admin: null
  },
  emotes: null,
  emoteList: null,
  title: null,
  titleUUID: null,
});

export const mutations = {
  setUser(state, user) {
    state.user = user;
  },
  toggleChat(state) {
    state.chat = !state.chat;
  },
  setEmotes(state, emotes) {
    state.emotes = emotes;
  },
  setEmoteList(state, emoteList) {
    state.emoteList = emoteList;
  },
  isAdmin(state) {
    state.user.admin = true;
  },
  setAuthorized(state) {
    state.authorized = true;
  },
  setToken(state, token) {
    state.token = token;
  },
  setRoomUUID(state, roomUUID) {
    state.roomUUID = roomUUID;
  },
  // setRoomPlayingTitle(state, title, roomUUID) {
  setRoomPlayingTitle(state, titleData) {
    let { title, roomUUID } = titleData
    state.title = title;
    // make sure that the roomUUID title matches the roomUUID before showing it (doing this to keep track of nowPlaying)
    state.titleUUID = roomUUID;
  }
};
