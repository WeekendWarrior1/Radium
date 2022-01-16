import http from "http";
import socketIO from "socket.io";
const torrentTrackerServer = require('bittorrent-tracker').Server;

const config = require("../nuxt.config.js");
const { ffmpegJobQueue, cleanUpffmpegDir } = require("../util/ffmpeg.js");


export default function() {
  this.nuxt.hook("render:before", renderer => {
    const server = http.createServer(this.nuxt.renderer.app);
    const io = socketIO(server);

    // overwrite nuxt.server.listen()
    this.nuxt.server.listen = (port, host) =>
      new Promise(resolve =>
        server.listen(
          process.env.PORT || 5555,
          process.env.HOST || "0.0.0.0",
          resolve
        )
      );
    // close this server on 'close' event
    this.nuxt.hook("close", async nuxt => {
      nuxt.server.close;
    });

    var users = [];
    var connections = [];
    let roomHlsUrl = null;
    let roomSubtitleUrl = null;
    var roomPlaying = null;

    // Add socket.io events
    const messages = [];
    io.on("connection", socket => {
      connections.push(socket);

      // When new user connects
      socket.on("newUser", user => {
        console.log("creating new user", users.length);

        const u = {
          id: socket.id,
          username: user.username,
          color: user.color,
          admin: user.admin,
        };

        // Push user into array
        users.push(u);

        // if first user in room, that user is admin
        // admin = u;

        // Sent user list to clients
        io.emit("userList", users);

        // Only request state if an admin is in room
        const check = users.find(obj => obj.admin == true);
        if (check) {
          // request info from that admin
          io.to(check.id).emit("requestState", socket.id);
        }

        if (users.length == 1) {
          users[0].admin = true;
          io.emit("userList", users);
        }
      });

      // Send state to new client (only ran if admin is in room)
      socket.on("sendState", data => {
        var state = {
          roomHlsUrl,
          roomSubtitleUrl,
          roomTime: data.time,
          roomState: data.state,
          roomPlaying
        };
        io.to(data.id).emit("setState", state);
      });

      // On successful admin authentication find and give user admin
      socket.on("setAdmin", user => {
        const u = users.find(obj => obj.id == socket.id);
        u.admin = true;
        io.emit("userList", users);
      });

      socket.on("play", (time) => {
        io.emit("serverPlay", time);
      });

      socket.on("pause", (time) => {
        io.emit("serverPause", time);
      });

      socket.on("sync", (currentTime) => {
        io.emit("serverSync", currentTime);
      });

      socket.on("changeStream", (newUUID, url, posterUrl) => {
        // TODO ugly and non discriminate, will need to change when software handles mutliple rooms
        for (let itemId in ffmpegJobQueue) {
          console.log(`Checking ffmpegJobQueue for any existing transcode jobs that need to be cancelled`);
          if (itemId != newUUID) {
            console.log(`Cancelling ${itemId} transcode job`);
            ffmpegJobQueue[itemId]['ffmpeg'].kill();
            // ffmpegJobQueue[itemId]['ffmpeg'].kill('SIGINT');
            // TODO just waiting 1000ms is a bit ugly
            setTimeout(function(){
              delete ffmpegJobQueue[itemId];
              cleanUpffmpegDir(itemId);
            },1000);
          }
        }
        roomHlsUrl = url;
        if (posterUrl) {
          io.emit("setPoster", posterUrl);
        }
        io.emit("setStream", url);
      });

      socket.on("message", message => {
        io.emit("sendMessage", message);
      });

      socket.on("changeSubtitles", url => {
        roomSubtitleUrl = url;
        io.emit("setSubtitles", url);
      });

      socket.on("nowPlaying", playing => {
        roomPlaying = playing;
        io.emit("setNowPlaying", playing);
      });

      // socket.on("searchJellyfin", searchTerm => {
      //   roomPlaying = playing;
      //   io.emit("setNowPlaying", playing);
      // });

      // On disconnect find and remove user from users array
      socket.on("disconnect", () => {
        const u = users.find(obj => obj.id == socket.id);

        if (users.indexOf(u) > -1) {
          users.splice(users.indexOf(u), 1);
        }

        io.emit("userList", users);
      });
    });

    // Fire up built in webtorrent tracker
    if (config.default.publicRuntimeConfig.WEBTORRENT_TRACKER_ENABLED) {
      const torrentTracker = new torrentTrackerServer({
        udp: false, // enable udp server? [default=true]
        http: false, // enable http server? [default=true]
        ws: true, // enable websocket server? [default=true]
        stats: false, // enable web-based statistics? [default=true]
        trustProxy: false, // enable trusting x-forwarded-for header for remote IP [default=false] TODO should this be configruable?
      })

      torrentTracker.on('error', function (err) {
        // fatal server error!
        console.log(err.message)
      })

      torrentTracker.on('warning', function (err) {
        // client sent bad data. probably not a problem, just a buggy client.
        console.log(err.message)
      })

      torrentTracker.on('listening', function () {
        const wsAddr = torrentTracker.http.address()
        const wsHost = wsAddr.address !== '::' ? wsAddr.address : 'localhost'
        const wsPort = wsAddr.port
        console.log(`WebSocket tracker: ws://${wsHost}:${wsPort}`)

      })

      // start tracker server listening!
      const torrentTrackerPort = config.default.publicRuntimeConfig.WEBTORRENT_TRACKER_PORT;
      const torrentTrackerHostname = config.default.publicRuntimeConfig.WEBTORRENT_TRACKER_ADDRESS;
      torrentTracker.listen(torrentTrackerPort, torrentTrackerHostname);
      }
  });
}
