const Profile = require('../model/Profile');

// Create Profile
exports.createProfile = async (req, res) => {
    try {
        const { name, timezone } = req.body;
        const profile = new Profile({ name, timezone });
        await profile.save();
        res.status(201).json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get All Profiles
exports.getProfiles = async (req, res) => {
    try {
        const profiles = await Profile.find();
        res.json(profiles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
