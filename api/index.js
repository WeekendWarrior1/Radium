const express = require("express");
const cors = require("cors");
const socket = require("socket.io");

// Create express instance
const app = express();

// Require API routes
const auth = require("./routes/auth");
const emotes = require("./routes/emotes");
const jellyfin = require("./routes/jellyfin");
const rooms = require("./routes/rooms");
const { makeSureSegmentIsFinished, staticFileServe } = require("./routes/hls");

app.use(cors({
	origin: '*',
	methods: ['GET', 'POST', 'DELETE'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-HTTP-Method-Override', 'Accept'],
	credentials: true,
}));

// Import API Routes
app.use(auth);
app.use(emotes);
app.use(jellyfin);
app.use(rooms);

app.use(makeSureSegmentIsFinished);
app.use(staticFileServe);

// Export express app
module.exports = app;

// Start standalone server if directly running
if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}
