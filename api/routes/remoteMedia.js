const { Router } = require("express");
import { validate as uuidValidate } from 'uuid';

const router = Router();
const { startHLSstream } = require('../../util/ffmpeg');

// const config = require("../../nuxt.config.js");

router.get(["/remoteMedia/:roomUUID/:filename/stream.m3u8"], async function (req, res, next) {
    try {
        if (req.params.filename === undefined) {
            throw new Error(`Paramater "item" not found in query parameters`);
        }
        if (req.params.roomUUID === undefined) {
            throw new Error(`Paramater "roomUUID" not found in query parameters`);
        }
        if (req.query.remoteFile === undefined) {
            throw new Error(`Paramater "remoteFile" not found in query parameters`);
        }
        if (!uuidValidate(req.params.roomUUID)) {
            throw new Error('Invalid room UUID');
        }
        const playlist = await startHLSstream(req.params.roomUUID, req.params.filename, req.query.remoteFile, []);

        res.header('Content-type', 'application/vnd.apple.mpegurl');
        res.send(playlist);

    } catch (error) {
        if (error.message.includes("not found in query parameters") || error.message == `Invalid room UUID`) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error.message);
        }
    }
});

module.exports = router;