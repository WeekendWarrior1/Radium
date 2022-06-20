const { Router } = require("express");
const fs = require('fs');
import { validate as uuidValidate } from 'uuid';

const router = Router();
const { startHLSstream } = require('../../util/ffmpeg');

const config = require("../../nuxt.config.js");

const videoFileExtensions = [
    '.mp4',
    '.mkv',
    '.mov',
    '.avi',
    '.flv',
    '.webm',
    '.mpg',
    '.ts',
    '.mpeg',
    '.m4v',
    '.wmv',
    '.ogg'
]

router.get(["/localfs/"], async function (req, res, next) {
    try {
        let directory = `${config.default.publicRuntimeConfig.LOCAL_MEDIA_DIRECTORY}${(req.query.directory || '')}`;
        const filenames = await fs.promises.readdir(directory);

        const response = [];
        if (req.query.directory) {
            response.push({
                'filename' : '..',
                'filetype' : 'isDirectory'
            });
        }
        for (let i in filenames) {
            let filetype = false;
            if ((await fs.promises.lstat(directory + filenames[i])).isFile()) {
                // only add videos
                for (let extension of videoFileExtensions) {
                    if (filenames[i].toLowerCase().endsWith(extension)) {
                        filetype = 'isFile';
                        break;
                    }
                }
            }
            if ((await fs.promises.lstat(directory + filenames[i])).isDirectory()) {
                filetype = 'isDirectory';
            }
            if (filetype) {
                response.push({
                    'filename' : filenames[i],
                    'filetype' : filetype
                }); 
            }
        }
        res.status(200).json(response);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.get(["/localfs/:roomUUID/:filename/stream.m3u8"], async function (req, res, next) {
    try {
        if (req.params.filename === undefined) {
            throw new Error(`Paramater "item" not found in query parameters`);
        }
        if (req.params.roomUUID === undefined) {
            throw new Error(`Paramater "roomUUID" not found in query parameters`);
        }
        if (!uuidValidate(req.params.roomUUID)) {
            throw new Error('Invalid room UUID');
        }
        const directory = req.query.directory || '';

        const playlist = await startHLSstream(req.params.roomUUID, req.params.filename,`${config.default.publicRuntimeConfig.LOCAL_MEDIA_DIRECTORY}${directory}${req.params.filename}`, []);

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