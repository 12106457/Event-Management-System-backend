const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    profiles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }],
    timezone: { type: String, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    updateLogs: [
        {
            updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' },
            message: String,   // add this
            previousValues: Object,
            updatedValues: Object,
            updatedAt: Date
        }
    ]
});

module.exports = mongoose.model('Event', eventSchema);
