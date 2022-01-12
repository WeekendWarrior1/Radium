const { Router } = require("express");
const fetch = require("node-fetch");

const router = Router();
const { ffmpegJobQueue, startHLSstream } = require('../../util/ffmpeg');

const config = require("../nuxt.config.js");


router.get("/jellyfin/search", async function (req, res, next) {
    try {
        if (req.query.searchTerm === undefined) {
            throw new Error('Key "searchTerm" not found in query parameters');
        }
        if (req.query.IncludeItemTypes === undefined || !(req.query.IncludeItemTypes === "Movie,Series" || req.query.IncludeItemTypes === "Movie" || req.query.IncludeItemTypes === "Series")) {
            req.query.IncludeItemTypes = "Movie,Series";
        }

        const response = await fetch(`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Users/${config.default.publicRuntimeConfig.JELLYFIN_USER}/Items?config.default.publicRuntimeConfig.JELLYFIN_API_KEY=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}&searchTerm=${req.query.searchTerm}&IncludeItemTypes=${req.query.IncludeItemTypes}&Limit=24&Recursive=true&ImageTypeLimit=1`);
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

        fetch(`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Items/${req.query.item}/Images/Primary?config.default.publicRuntimeConfig.JELLYFIN_API_KEY=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}&maxHeight=669&maxWidth=446&tag=${req.query.tag}&quality=90`).then(actual => {
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
        const response = await fetch(`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Users/${config.default.publicRuntimeConfig.JELLYFIN_USER}/Items/${req.query.item}?config.default.publicRuntimeConfig.JELLYFIN_API_KEY=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}`)
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
        const response = await fetch(`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Shows/${req.query.item}/Seasons?config.default.publicRuntimeConfig.JELLYFIN_API_KEY=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}`)
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
        const response = await fetch(`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Shows/${req.query.item}/Episodes?config.default.publicRuntimeConfig.JELLYFIN_API_KEY=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}&seasonId=${req.query.season}&Fields=Overview`)
        res.status(200).json(await response.json());

    } catch (error) {
        if (error.message.includes("not found in query parameters")) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error.message);
        }
    }
});

// router.get("/jellyfin/stream", async function (req, res, next) {
// router.get(["/jellyfin/stream","/jellyfin/stream/:item"], async function (req, res, next) {
// TODO make `/jellyfin/stream/itemId.m3u8`
router.get(["/jellyfin/stream.m3u8"], async function (req, res, next) {
    try {
        if (req.query.item === undefined) {
            throw new Error(`Key "item" not found in query parameters`);
        }

        let playlist = await startHLSstream(req.query.item,`${config.default.publicRuntimeConfig.JELLYFIN_BASE_URI}/Items/${req.query.item}/Download?config.default.publicRuntimeConfig.JELLYFIN_API_KEY=${config.default.publicRuntimeConfig.JELLYFIN_API_KEY}`)

        res.send(playlist);

    } catch (error) {
        if (error.message.includes("not found in query parameters")) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error.message);
        }
    }
});

module.exports = router;
