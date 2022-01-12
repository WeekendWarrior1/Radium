const express = require("express");
const config = require("../../nuxt.config.js");
const fs = require('fs');

exports.makeSureSegmentIsFinished = async function makeSureSegmentIsFinished(req, res, next) {
    let itemId = req.path.split('/')[2];
    let fileToServe = req.path.split('/')[3];
    let itemDirectory = config.default.publicRuntimeConfig.HLS_SERVE_DIR + itemId;
    let segmentPath = config.default.publicRuntimeConfig.PUBLIC + req.path;

    //check if base folder exists (client error if itemDirectory doesn't exist)
    try {
        await fs.promises.access(itemDirectory)
    } catch {
        console.log(`${itemId} dir doesn't exist in HLS Server Dir (${config.default.publicRuntimeConfig.HLS_SERVE_DIR})`);
        res.sendStatus(404);
    }

    // check if file is a m3u8 (server error, m3u8 should always exist if a stream is active)
    if (req.path.endsWith(`.m3u8`)) {
        next();
        return;
    }

    // check directory to see if file exists
    let segmentNumber = fileToServe.split('.ts')[0];
    let nextNum = (parseInt(segmentNumber) + 1).toString().padStart(segmentNumber.length, '0');
    let nextSegment = fileToServe.replace(segmentNumber, nextNum);
    try {
        await fs.promises.access(segmentPath);
        await fs.promises.access(config.default.publicRuntimeConfig.PUBLIC + req.path.replace(fileToServe, nextSegment));
        // if got to here, send the file
        next();
        return;
    } catch {
        try {
            // can track end of ffmpeg job by checking for ffmpeg_finished (TODO damn ugly)
            await fs.promises.access(`${itemDirectory}/ffmpeg_finished`);
            next();
            return;
        } catch {
            // timeout dir watch after 30s
            const ac = new AbortController();
            const { signal } = ac;
            setTimeout(() => ac.abort(), 30000);

            try {
                const watcher = fs.promises.watch(itemDirectory, { signal });
                for await (const event of watcher) {
                    if (event.filename == nextSegment) {
                        next();
                        return;
                    }
                }
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.log(`${fileToServe} didn't appear after 30 seconds, aborting (408 - timeout)`);
                    res.sendStatus(408);
                    return;
                }
            }
        }
    }
}

exports.staticFileServe = express.static(config.default.publicRuntimeConfig.PUBLIC, { fallthrough: false });