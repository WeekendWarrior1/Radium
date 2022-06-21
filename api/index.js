const express = require("express");
const cors = require("cors");
const socket = require("socket.io");

const config = require("../nuxt.config.js");

// Create express instance
const app = express();

// Require API routes
const auth = require("./routes/auth");
const emotes = require("./routes/emotes");
const jellyfin = require("./routes/jellyfin");
const rooms = require("./routes/rooms");
const localfs = require("./routes/localfs");
const remoteMedia = require("./routes/remoteMedia");
const { makeSureThumbExists, makeSureSegmentIsFinished } = require("./routes/hls");

app.use(cors({
	origin: '*',
	methods: ['GET', 'POST', 'DELETE'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-HTTP-Method-Override', 'Accept'],
	credentials: true,
}));

// Import API Routes
app.use(auth);
app.use(emotes);
app.use(rooms);

if (config.default.publicRuntimeConfig.JELLYFIN_ENABLED) {
  app.use(jellyfin);
}
if (config.default.publicRuntimeConfig.LOCAL_MEDIA_DIRECTORY) {
  app.use(localfs);
}
if (config.default.publicRuntimeConfig.REMOTE_MEDIA_ENABLED) {
  app.use(remoteMedia);
}

app.use(makeSureThumbExists);
app.use(makeSureSegmentIsFinished);

// staticFileServe
app.use(express.static(config.default.publicRuntimeConfig.PUBLIC, { fallthrough: false }));

// Export express app
module.exports = app;

// Start standalone server if directly running
if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}
