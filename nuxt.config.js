export default {
  publicRuntimeConfig: {
    HLS_URL:
      process.env.HLS_URL ||
      // "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
      "http://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8",
      // "http://localhost:3000/api/jellyfin/stream?item=7bbe68ea4cd2b49c8da4a2bcf39bdb24",
    BASE_URL: process.env.BASE_URL || "http://localhost:3000",
    ADMIN_TOKEN: process.env.ADMIN_TOKEN || "placeholder",
    // ADMIN_TOKEN: process.env.ADMIN_TOKEN,
    API_URL: process.env.API_URL || `http://localhost:3000/api`,
    OMDB_API_KEY: process.env.OMDB_API_KEY || "7c3178bf",
    VERSION: process.env.npm_package_version,
    PROTECT: process.env.PROTECTED,
    PUBLIC: `/home/weekendwarrior1/git/weekendwarrior1/Radium/public`,
    HLS_SERVE_DIR: `/home/weekendwarrior1/git/weekendwarrior1/Radium/public/hls/`,
    HLS_STREAM_ROOT: `http://localhost:3000/api/hls/`,
    HLS_SEGMENT_SIZE: 10,
    JELLYFIN_ENABLED: true,
    JELLYFIN_BASE_URI: "http://192.168.1.2:8096",
    JELLYFIN_USER: "placeholder", /* Required to use jellyfin search, may be used later to show what's been watched*/
    JELLYFIN_API_KEY: "placeholder",
    io: {
      // will be available in this.$config.io
      sockets: [
        {
          name: "main",
          url: process.env.BASE_URL || "http://localhost:3000",
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
      }
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
    sockets: [{ name: "config", url: "http://localhost:3000", default: false }]
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
