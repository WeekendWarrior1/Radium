const { Router } = require("express");
import { validate as uuidValidate } from 'uuid';

const router = Router();
const { startYTDLPHLSstream, ytdlpMediaToRoomMetadata } = require('../../util/ffmpeg');

// const config = require("../../nuxt.config.js");

router.get(["/ytdlp/:roomUUID/stream.m3u8"], async function (req, res, next) {
    try {
        if (req.params.roomUUID === undefined) {
            throw new Error(`Paramater "roomUUID" not found in query parameters`);
        }
        if (req.query.remotePage === undefined) {
            throw new Error(`Paramater "remotePage" not found in query parameters`);
        }
        if (!uuidValidate(req.params.roomUUID)) {
            throw new Error('Invalid room UUID');
        }

        const { url, playlist } = await startYTDLPHLSstream(req.params.roomUUID, req.query.remotePage, req.query.remotePage, []);
        if (url !== undefined) {
            res.set('location', url);
            res.status(301).send()
        } else {
            res.header('Content-type', 'application/vnd.apple.mpegurl');
            res.send(playlist);
        }

    } catch (error) {
        if (error.message.includes("not found in query parameters") || error.message == `Invalid room UUID`) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error.message);
        }
    }
});

// add function here to update room socket with video metadata
router.get(["/ytdlp/:roomUUID/MediaInfo"], async function (req, res, next) {
    try {
        if (req.params.roomUUID === undefined) {
            throw new Error(`Paramater "roomUUID" not found in query parameters`);
        }
        if (!uuidValidate(req.params.roomUUID)) {
            throw new Error('Invalid room UUID');
        }

        const response = await ytdlpMediaToRoomMetadata(req.params.roomUUID);

        res.status(200).json(response);
    } catch (error) {
        if (error.message.includes("not found in query parameters") || error.message == `Invalid room UUID`) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error.message);
        }
    }
});

module.exports = router;