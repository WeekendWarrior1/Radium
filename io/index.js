import http from "http";
import socketIO from "socket.io";
const torrentTrackerServer = require('bittorrent-tracker').Server;

const config = require("../nuxt.config.js");
const { ffmpegJobQueue, cleanUpffmpegDir } = require("../util/ffmpeg.js");
const { roomsCache } = require('../util/roomsCache');

import { validate as uuidValidate } from 'uuid';



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

    let users = [];
    let connections = [];
    // let roomHlsUrl = null;
    // let roomSubtitleUrl = null;
    // let roomPlaying = null;

    // const roomsCache = {};
    // exports.roomsCache = roomsCache;

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

      socket.on("userEntersRoom", (roomUUID, user) => {
        console.log("Adding user:", user.username, roomsCache[roomUUID].users.length);

        const u = {
          id: socket.id,
          username: user.username,
          color: user.color,
          admin: user.admin,
        };

        // Push user into array
        roomsCache[roomUUID].users.push(u);

        socket.join(roomUUID);

        // Sent user list to clients
        io.to(roomUUID).emit("userList", roomUUID, roomsCache[roomUUID].users);

        // request state from first in room
        if (roomsCache[roomUUID].users.length > 1) {
          // Not the first in the room
          io.to(roomsCache[roomUUID].users[0].id).emit("requestState", roomUUID, socket.id);
        } else if (roomsCache[roomUUID].roomHlsUrl) {
          // first user in room, but room has roomHlsUrl already
          let state = {
            'roomHlsUrl': roomsCache[roomUUID].roomHlsUrl,
            'roomPlaying': roomsCache[roomUUID].roomPlaying,
          }
          // room time may also exist and need to be sent
          if (roomsCache[roomUUID].currentTime) {
            state['roomTime'] = roomsCache[roomUUID].currentTime;
          }
          io.to(socket.id).emit("setState", state);
        }
        if (roomsCache[roomUUID].posterUrl) {
          io.to(socket.id).emit("setPoster", roomsCache[roomUUID].posterUrl);
        }
        io.emit("roomsUpdated", roomsCache);
      });

      socket.on("userLeavesRoom", (roomUUID, user, currentTime) => {
        const u = roomsCache[roomUUID].users.find(obj => obj.username == user.username);

        if (roomsCache[roomUUID].users.indexOf(u) > -1) {
          console.log(`Removing ${user.username} from room: ${roomUUID}`);
          roomsCache[roomUUID].users.splice(roomsCache[roomUUID].users.indexOf(u), 1);
          if (roomsCache[roomUUID].users.length == 0 && currentTime > 0) {
            roomsCache[roomUUID]['currentTime'] = currentTime;
          }
          io.emit("userList", roomsCache[roomUUID].users);
          io.emit("roomsUpdated", roomsCache);
          socket.leave(roomUUID);
        }
      });


      // Send state to new client (only ran if admin is in room)
      socket.on("sendState", (roomUUID, data) => {
        // TODO these should just be read and written from the roomsCache
        let state = {
          'roomHlsUrl': roomsCache[roomUUID].roomHlsUrl,
          // roomSubtitleUrl,
          'roomTime': data.time,
          'roomPaused': data.paused,
          'roomPlaying': roomsCache[roomUUID].roomPlaying,

        };
        io.to(data.id).emit("setState", state);
      });

      // On successful admin authentication find and give user admin
      socket.on("setAdmin", user => {
        const u = users.find(obj => obj.id == socket.id);
        u.admin = true;
        io.emit("userList", users);
      });

      socket.on("play", (roomUUID, time) => {
        io.to(roomUUID).emit("serverPlay", time);
      });

      socket.on("pause", (roomUUID, time) => {
        io.to(roomUUID).emit("serverPause", time);
      });

      socket.on("sync", (roomUUID, currentTime) => {
        io.to(roomUUID).emit("serverSync", currentTime);
      });

      socket.on("changeStream", (roomUUID, url, posterUrl) => {
        // TODO ugly to delete the folder ffmpeg is writing to, but seems to be the only way I can cancel it lol
        for (let room in ffmpegJobQueue) {
          console.log(`Checking ffmpegJobQueue[${roomUUID}] for any existing transcode jobs that need to be cancelled`);
          if (room === roomUUID) {
            console.log(`Cancelling ${roomUUID} transcode job`);
            if (ffmpegJobQueue[roomUUID]['ffmpeg'] !== undefined) {
              ffmpegJobQueue[roomUUID]['ffmpeg'].kill();
              delete ffmpegJobQueue[roomUUID]['ffmpeg'];
              cleanUpffmpegDir(roomUUID);
            }
          }
        }
        roomsCache[roomUUID].roomHlsUrl = url;
        if (posterUrl) {
          roomsCache[roomUUID].posterUrl = posterUrl;
          io.to(roomUUID).emit("setPoster", posterUrl);
        }
        io.to(roomUUID).emit("setStream", url);
        io.emit("roomsUpdated", roomsCache);
      });

      socket.on("message", (roomUUID, message) => {
        io.to(roomUUID).emit("sendMessage", message);
      });

      socket.on("changeSubtitles", url => {
        roomSubtitleUrl = url;
        io.emit("setSubtitles", url);
      });

      socket.on("nowPlaying", (roomUUID, mediaInfo) => {
        roomsCache[roomUUID].roomPlaying = mediaInfo;
        io.to(roomUUID).emit("setNowPlaying", mediaInfo);
        io.emit("roomsUpdated", roomsCache);
      });

      // using post API instead
      // socket.on("createRoom", (UUID) => {
      //   console.log("createRoom",UUID, roomsCache);
      //   if (uuidValidate(UUID)) {
      //     roomsCache[UUID] = {
      //       users: [],
      //       roomHlsUrl: null,
      //       roomPlaying: null,
      //     }
      //     io.emit("roomsUpdated", roomsCache);
      //   }
      // });

      // relay room creation to all active clients
      socket.on("newRoomCreated", () => {
        io.emit("roomsUpdated", roomsCache);
      });

      // relay room deletion to all active clients
      socket.on("roomDeleted", () => {
        io.emit("roomsUpdated", roomsCache);
      });

      // On disconnect find and remove user from users array
      socket.on("disconnect", () => {
        for (let room in roomsCache) {
          const u = roomsCache[room].users.find(obj => obj.id == socket.id);

          if (roomsCache[room].users.indexOf(u) > -1) {
            console.log(`Removing ${u.username} from room: ${room}`);
            roomsCache[room].users.splice(roomsCache[room].users.indexOf(u), 1);
            io.emit("userList", roomsCache[room].users);
            io.emit("roomsUpdated", roomsCache);
            socket.leave(room);
          }
        }
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
