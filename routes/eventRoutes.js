const express = require('express');
const router = express.Router();
const eventController = require('../controller/eventController');

router.post('/', eventController.createEvent);
router.get('/:profileId', eventController.getEventsByProfile);
router.put('/:eventId', eventController.updateEvent);

module.exports = router;
