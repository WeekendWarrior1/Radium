const { Router } = require("express");
const fetch = require("node-fetch");
const retryFetch = require('fetch-retry')(fetch);
import { validate as uuidValidate } from 'uuid';

const router = Router();
const { startHLSstream, ffmpegConvertSubtitles } = require('../../util/ffmpeg');

const config = require("../../nuxt.config.js");


router.get("/jellyfin/search", async function (req, res, next) {
    try {
        if (req.query.searchTerm === undefined) {
            throw new Error('Key "searchTerm" not found in query parameters');
        }
        if (req.query.IncludeItemTypes === undefined || !(req.query.IncludeItemTypes === "Movie,Series" || req.query.IncludeItemTypes === "Movie" || req.query.IncludeItemTypes === "Series")) {
            req.query.IncludeItemTypes = "Movie,Series";
        }

        const response = await fetch(`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Users/${config.default.publicRuntimeConfig.JELLYFIN_USER}/Items?api_key=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}&searchTerm=${req.query.searchTerm}&IncludeItemTypes=${req.query.IncludeItemTypes}&Limit=24&Recursive=true&ImageTypeLimit=1`);
        const data = await response.json();

        res.status(200).json(data);
    } catch (error) {
        if (error.message === 'Key "searchTerm" not found in query parameters') {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error);
        }
    }
});

router.get("/jellyfin/poster", async function (req, res, next) {
    try {
        if (req.query.item === undefined || req.query.tag === undefined) {
            throw new Error(`Key "${(req.query.item === undefined) ? 'item' : 'tag'}" not found in query parameters`);
        }
        fetch(`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Items/${req.query.item}/Images/Primary?api_key=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}&maxHeight=669&maxWidth=446&tag=${req.query.tag}&quality=90`).then(actual => {
            actual.headers.forEach((v, n) => res.setHeader(n, v));
            actual.body.pipe(res);
        });
    } catch (error) {
        if (error.message.includes("not found in query parameters")) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error.message);
        }
    }
});

router.get("/jellyfin/backdrop", async function (req, res, next) {
    try {
        if (req.query.item === undefined || req.query.tag === undefined) {
            throw new Error(`Key "${(req.query.item === undefined) ? 'item' : 'tag'}" not found in query parameters`);
        }
        fetch(`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Items/${req.query.item}/Images/Backdrop?api_key=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}&maxWidth=1920&tag=${req.query.tag}&quality=80`).then(actual => {
            actual.headers.forEach((v, n) => res.setHeader(n, v));
            actual.body.pipe(res);
        });
    } catch (error) {
        if (error.message.includes("not found in query parameters")) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error.message);
        }
    }
});

// TODO hit this route to get movie info (used in stream to get filename)
// and if user clicks on name of movie in jellyfin movie cards, present description via polling jellyfin
router.get("/jellyfin/items", async function (req, res, next) {
    try {
        if (req.query.item === undefined) {
            throw new Error(`Key "item" not found in query parameters`);
        }
        const response = await fetch(`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Users/${config.default.publicRuntimeConfig.JELLYFIN_USER}/Items/${req.query.item}?api_key=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}`)
        res.status(200).json(await response.json());

    } catch (error) {
        if (error.message.includes("not found in query parameters")) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error.message);
        }
    }
});

router.get("/jellyfin/seasons", async function (req, res, next) {
    try {
        if (req.query.item === undefined) {
            throw new Error(`Key "item" not found in query parameters`);
        }
        const response = await fetch(`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Shows/${req.query.item}/Seasons?api_key=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}`)
        res.status(200).json(await response.json());

    } catch (error) {
        if (error.message.includes("not found in query parameters")) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error.message);
        }
    }
});

router.get("/jellyfin/episodes", async function (req, res, next) {
    try {
        if (req.query.item === undefined || req.query.season === undefined) {
            throw new Error(`Key "${(req.query.item === undefined) ? 'item' : 'season'}" not found in query parameters`);
        }
        const response = await fetch(`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Shows/${req.query.item}/Episodes?api_key=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}&seasonId=${req.query.season}&Fields=Overview`)
        res.status(200).json(await response.json());

    } catch (error) {
        if (error.message.includes("not found in query parameters")) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error.message);
        }
    }
});

router.get(["/jellyfin/:roomUUID/:item/stream.m3u8"], async function (req, res, next) {
    try {
        if (req.params.item === undefined) {
            throw new Error(`Paramater "item" not found in query parameters`);
        }
        if (req.params.roomUUID === undefined) {
            throw new Error(`Paramater "roomUUID" not found in query parameters`);
        }
        if (!uuidValidate(req.params.roomUUID)) {
            throw new Error('Invalid room UUID');
        }
        let subtitlesStreams = await jellyfinGetSubtitles(req.params.item);

        let playlist = await startHLSstream(req.params.roomUUID, req.params.item,`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Items/${req.params.item}/Download?api_key=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}`, subtitlesStreams);

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

router.get("/jellyfin/subtitlestream/:guid/:itemId/Subtitles/:streamIndex/0/:filename", async function (req, res, next) {
    console.log('hit /jellyfin/subtitlestream/', req.params);
    try {
        let url = `${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Videos/${req.params.guid}/${req.params.itemId}/Subtitles/${req.params.streamIndex}/0/${req.params.filename}?api_key=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}`;
        if (!req.params.filename.endsWith('.vtt')) {
            // have to use ffmpeg to convert to vtt
            // attempt sanitise
            if (url.includes('"') || url.includes(' ') || url.includes('|') || url.includes('&') || url.includes('\\')) {
                throw new Error(`Don't even try it`);
            }
            let subFilename = `${config.default.publicRuntimeConfig.HLS_SERVE_DIR}${req.params.itemId}/${req.params.streamIndex}.vtt`;
            try {
                // check directory to see if ffmpeg has already been run
                await fs.promises.access(subFilename);
                res.sendFile(subFilename);
            } catch {
                // file didn't exist in directory
                await ffmpegConvertSubtitles(url,subFilename);
                res.sendFile(subFilename);
            }
        } else {
            // jellyfin doesn't always return here, so be ready to retry
            retryFetch(url).then(actual => {
                actual.headers.forEach((v, n) => res.setHeader(n, v));
                actual.body.pipe(res);
            });
        }
    } catch (error) {
        if (error.message.includes("not found in query parameters")) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error.message);
        }
    }
});

async function jellyfinGetSubtitles(itemId) {
    const response = await (await fetch(`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Items/${itemId}/PlaybackInfo?api_key=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}&UserId=${config.default.publicRuntimeConfig.JELLYFIN_USER}`, {
        method: 'post',
        body: JSON.stringify({
            "DeviceProfile": {
                "SubtitleProfiles": [
                {
                    "Format": "vtt",
                    "Method": "External"
                },
                {
                    "Format": "ass",
                    "Method": "External"
                },
                {
                    "Format": "ssa",
                    "Method": "External"
                }
                ]
            }
        }),
        headers: {'Content-Type': 'application/json'}
    })).json();
    let subtitlesStreams = []
    for (let stream of response.MediaSources[0].MediaStreams) {
        if (stream.IsTextSubtitleStream && stream.SupportsExternalStream) {
            subtitlesStreams.push(stream);
        }
    }
    return subtitlesStreams;
}

module.exports = router;
