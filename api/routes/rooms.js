const { Router } = require("express");
const router = Router();

import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

const { roomsCache } = require('../../util/roomsCache');
const config = require("../../nuxt.config.js");

// create room
router.post("/rooms", async function (req, res, next) {
    try {
        // TODO body needs to include room settings (eg. room creator prevents other people from changing source, seeking, stopping and starting)
        const generatedUUID = uuidv4();

        roomsCache[generatedUUID] = {
            users: [],
            roomHlsUrl: null,
            // TODO roomPLaying should contain lots of metadata, including roomPoster
            roomPlaying: null,
        }

        const data = { 'UUID': generatedUUID }
        res.status(201).json(data);

        // TODO should I send a socket here to trigger a new
    } catch (error) {
        if (error.message === 'Key "searchTerm" not found in query parameters') {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error);
        }
    }
});

// get all rooms info
router.get("/rooms", async function (req, res, next) {
    try {
        res.status(200).json(roomsCache);
    } catch (error) {
        if (error.message === 'Key "searchTerm" not found in query parameters') {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error);
        }
    }
});

// get specific room info
router.get("/rooms/:UUID", async function (req, res, next) {
    try {
        if (!uuidValidate(req.params.UUID)) {
            throw new Error('Invalid room UUID');
        }
        if (req.params.UUID === undefined) {
            throw new Error('Room UUID missing from request');
        }
        if (roomsCache[req.params.UUID] === undefined) {
            throw new Error(`Room ${req.params.UUID} doesn't exist`);
        }

        res.status(200).json(roomsCache[req.params.UUID]);
    } catch (error) {
        // TODO ugly message catching
        if (error.message === 'Invalid room UUID' || error.message === 'Room UUID missing from request' || error.message.endsWith("doesn't exist")) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error);
        }
    }
});

// delete
router.delete("/rooms/:UUID", async function (req, res, next) {
    try {
        if (!uuidValidate(req.params.UUID)) {
            throw new Error('Invalid room UUID');
        }
        if (req.params.UUID === undefined) {
            throw new Error('Room UUID missing from request');
        }
        if (roomsCache[req.params.UUID] === undefined) {
            throw new Error(`Room ${req.params.UUID} doesn't exist`);
        }
        deleteRoom(req.params.UUID);

        res.status(204).send();
    } catch (error) {
        // TODO ugly message catching
        if (error.message === 'Invalid room UUID' || error.message === 'Room UUID missing from request' || error.message.endsWith("doesn't exist")) {
            res.status(400).send(error.message);
        } else {
            res.status(500).send(error);
        }
    }
});


function deleteRoom(UUID) {
    console.log(`deleting room, UUID: ${UUID}`);
    // TODO what happens when someone deletes a room that is not empty??
    // should kick users back to landing page
    // could use websockets to throw up a toast/notification
    delete roomsCache[UUID];
}

module.exports = router;