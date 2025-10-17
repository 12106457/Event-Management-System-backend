const Event = require('../model/Event');
const Profile = require('../model/Profile');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

// Create Event
exports.createEvent = async (req, res) => {
    try {
        const { profiles, timezone: eventTimezone, start, end } = req.body;

        const startTime = dayjs.tz(start, eventTimezone);
        const endTime = dayjs.tz(end, eventTimezone);
        if (endTime.isBefore(startTime)) {
            return res.status(400).json({ error: 'End time cannot be before start time.' });
        }

        const event = new Event({
            profiles,
            timezone: eventTimezone,
            start: startTime.toDate(),
            end: endTime.toDate()
        });

        await event.save();
        res.status(201).json(event);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.getEventsByProfile = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { timezone: timezoneQuery } = req.query;

    // check profile exists
    const profile = await Profile.findById(profileId);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // fetch events directly matching profileId and optional timezone
    const query = { profiles: profileId };
    if (timezoneQuery) query.timezone = timezoneQuery;

    const events = await Event.find(query).populate("profiles", "name");

    // map to frontend-friendly format
    const userEvents = events.map((event) => ({
      _id: event._id,
      profiles: event.profiles.map((p) => ({ _id: p._id, name: p.name })),
      timezone: event.timezone,
      start: dayjs(event.start).tz(timezoneQuery || profile.timezone).format(
        "MMM DD, YYYY [at] hh:mm A"
      ),
      end: dayjs(event.end).tz(timezoneQuery || profile.timezone).format(
        "MMM DD, YYYY [at] hh:mm A"
      ),
      createdAt: dayjs(event.createdAt)
        .tz(timezoneQuery || profile.timezone)
        .format("MMM DD, YYYY [at] hh:mm A"),
      updatedAt: dayjs(event.updatedAt)
        .tz(timezoneQuery || profile.timezone)
        .format("MMM DD, YYYY [at] hh:mm A"),
      updateLogs: event.updateLogs.map((log) => ({
       updatedBy: log.updatedBy,
        message: log.message,
        updatedAt: dayjs(log.updatedAt).tz(profile.timezone).format('MMM DD, YYYY [at] hh:mm A')
      })),
    }));

    res.json(userEvents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { profiles, start, end, updatedBy, timezone: newTimezone } = req.body;

    const event = await Event.findById(eventId).populate("profiles", "name");
    if (!event) return res.status(404).json({ error: "Event not found" });

    const messages = [];
    const previousValues = {};
    const updatedValues = {};

    // --- Helper: normalize date for accurate comparison ---
    const normalize = (date) => dayjs(date).second(0).millisecond(0);

    // --- Profiles update ---
    if (profiles) {
      const profileObjs = await Profile.find({ _id: { $in: profiles } }, "name");
      const oldIds = event.profiles.map((p) => p._id.toString()).sort().join(",");
      const newIds = profileObjs.map((p) => p._id.toString()).sort().join(",");

      if (oldIds !== newIds) {
        previousValues.profiles = event.profiles.map((p) => p.name);
        updatedValues.profiles = profileObjs.map((p) => p.name);
        const newNames = profileObjs.map((p) => p.name).join(", ");
        messages.push(`Profiles changed to: ${newNames}`);
        event.profiles = profileObjs;
      }
    }

    // --- Start date/time update ---
    if (start && !normalize(start).isSame(normalize(event.start))) {
      previousValues.start = event.start;
      updatedValues.start = dayjs(start).tz(newTimezone || event.timezone).toDate();
      messages.push("Start date/time updated");
      event.start = updatedValues.start;
    }

    // --- End date/time update ---
    if (end && !normalize(end).isSame(normalize(event.end))) {
      previousValues.end = event.end;
      updatedValues.end = dayjs(end).tz(newTimezone || event.timezone).toDate();
      messages.push("End date/time updated");
      event.end = updatedValues.end;
    }

    // --- Timezone update ---
    if (newTimezone && newTimezone !== event.timezone) {
      previousValues.timezone = event.timezone;
      updatedValues.timezone = newTimezone;
      messages.push(`Timezone updated to ${newTimezone}`);
      event.timezone = newTimezone;
    }

    // --- Update timestamp ---
    event.updatedAt = new Date();

    // --- Push update log if any real changes ---
    let log = null;
    if (messages.length > 0) {
      log = {
        updatedBy, // must be ObjectId
        message: messages.join(", "),
        previousValues,
        updatedValues,
        updatedAt: new Date(),
      };
      event.updateLogs.push(log);
      await event.save();
    }

    res.json({
      updated: messages.length > 0,
      messages,
      log,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
