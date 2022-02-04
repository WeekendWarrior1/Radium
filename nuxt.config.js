export default {
  publicRuntimeConfig: {
    HLS_URL:
      process.env.HLS_URL || 
      "",
      // "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
      // "http://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8",
      // "http://localhost:5555/api/jellyfin/stream?item=7bbe68ea4cd2b49c8da4a2bcf39bdb24",
    BASE_URL: process.env.BASE_URL || "http://localhost:5555",
    ADMIN_TOKEN: process.env.ADMIN_TOKEN || "placeholder",
    // ADMIN_TOKEN: process.env.ADMIN_TOKEN,
    API_URL: process.env.API_URL || `http://localhost:5555/api`,
    OMDB_API_KEY: process.env.OMDB_API_KEY || "7c3178bf",
    VERSION: process.env.npm_package_version,
    PROTECT: process.env.PROTECTED,
    PUBLIC: process.env.PUBLIC || `/home/weekendwarrior1/git/weekendwarrior1/Radium/public`,
    HLS_SERVE_DIR: process.env.HLS_SERVE_DIR || `/home/weekendwarrior1/git/weekendwarrior1/Radium/public/hls/`,
    HLS_STREAM_ROOT: process.env.HLS_STREAM_ROOT || `http://localhost:5555/api/hls/`,
    HLS_SEGMENT_SIZE: process.env.HLS_SEGMENT_SIZE || 10, // default 10 seconds
    // FFMPEG_PRESET_SPEED: process.env.FFMPEG_PRESET_SPEED || `slow`,
    FFMPEG_PRESET_SPEED: process.env.FFMPEG_PRESET_SPEED || `ultrafast`,
    WEBTORRENT_TRACKER_ENABLED: process.env.WEBTORRENT_TRACKER_ENABLED || true, // TODO this config really only works if you're running the builtin tracker locally
    WEBTORRENT_BASE_URL: process.env.WEBTORRENT_BASE_URL || "ws://localhost:8001",
    WEBTORRENT_TRACKER_ADDRESS: process.env.WEBTORRENT_TRACKER_ADDRESS || "localhost",
    WEBTORRENT_TRACKER_PORT: process.env.WEBTORRENT_TRACKER_PORT || "8001",

    // internal, not web forwarded or facing ->
    JELLYFIN_ENABLED: process.env.JELLYFIN_ENABLED || true,
    JELLYFIN_BASE_URI: process.env.JELLYFIN_BASE_URI || "http://192.168.1.2:8096",
    JELLYFIN_USER: process.env.JELLYFIN_USER || "placeholder", /* Required to use jellyfin search, may be used later to show what's been watched*/
    JELLYFIN_API_KEY: process.env.JELLYFIN_API_KEY || "placeholder",
    JACKETT_BASE_URI: process.env.JACKETT_BASE_URI || "http://192.168.1.2:9117",
    JACKETT_API_KEY: process.env.JACKETT_API_KEY || "placeholder",
    DELUGE_BASE_URI: process.env.DELUGE_BASE_URI || "http://192.168.1.2:8112",
    io: {
      // will be available in this.$config.io
      sockets: [
        {
          name: "main",
          url: process.env.BASE_URL || "http://localhost:5555",
          default: true
        }
      ]
    }
  },
  /*
   ** Nuxt rendering mode
   ** See https://nuxtjs.org/api/configuration-mode
   */
  mode: "universal",
  /*
   ** Nuxt target
   ** See https://nuxtjs.org/api/configuration-target
   */
  target: "server",
  /*
   ** Headers of the page
   ** See https://nuxtjs.org/api/configuration-head
   */
  head: {
    title: process.env.npm_package_name || "",
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        hid: "description",
        name: "description",
        content: process.env.npm_package_description || ""
      },
    ],
    script: [
      // p2p (webtorrent) media distribution
      { src: 'https://cdn.jsdelivr.net/npm/p2p-media-loader-core@latest/build/p2p-media-loader-core.min.js', /*async: true, defer: true*/ },
      { src: 'https://cdn.jsdelivr.net/npm/p2p-media-loader-hlsjs@latest/build/p2p-media-loader-hlsjs.min.js', /*async: true, defer: true*/ },

      // video.js
      // 16 seems to be latest that p2p works with contrib-hls
      // { src: 'https://vjs.zencdn.net/7.16.0/video.min.js', /*async: true, defer: true*/ },
      // { src: 'https://vjs.zencdn.net/7.17.0/video.min.js', /*async: true, defer: true*/ },
      { src: '/video.min.js', /*async: true, defer: true*/ },
      // { src: '/video.js', /*async: true, defer: true*/ },

      // hls tech
      // 0.8.9 ?
      // { src: 'https://cdn.jsdelivr.net/npm/videojs-contrib-hls.js@latest', /*async: true, defer: true*/ },
      // { src: 'https://cdn.streamroot.io/videojs-hlsjs-plugin/1/stable/videojs-hlsjs-plugin.js', /*async: true, defer: true*/ },
      { src: '/videojs-hlsjs-plugin.js', /*async: true, defer: true*/ },
    ],
    link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }]
  },
  /*
   ** Global CSS
   */
  css: ["video.js/dist/video-js.css"],
  /*
   ** Plugins to load before mounting the App
   ** https://nuxtjs.org/guide/plugins
   */
  plugins: [],
  /*
   ** Auto import components
   ** See https://nuxtjs.org/api/configuration-components
   */
  components: true,
  /*
   ** Nuxt.js dev-modules
   */
  buildModules: ["@nuxtjs/dotenv"],
  /*
   ** Nuxt.js modules
   */
  modules: [
    // Doc: https://buefy.github.io/#/documentation
    "nuxt-buefy",
    // Doc: https://axios.nuxtjs.org/usage
    "@nuxtjs/axios",
    "@nuxt/http",
    "~/io",
    "nuxt-socket-io"
  ],
  io: {
    sockets: [{ name: "config", url: "http://localhost:5555", default: false }]
  },
  /*
   ** Axios module configuration
   ** See https://axios.nuxtjs.org/options
   */
  axios: {},
  /*
   ** Server Middleware
   */
  serverMiddleware: {
    "/api": "~/api"
  },
  /*
   ** Build configuration
   ** See https://nuxtjs.org/api/configuration-build/
   */
  build: {},
  telemetry: false
};
