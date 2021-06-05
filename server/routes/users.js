const router = require('express').Router();
const User = require('../models/User');

router.get('/', async (req, res) => {
    const users = await User.find({}).select({ "_id": 1, "name": 1, "email": 1, "group": 1, "createdAt": 1});

    res.json(users);
});

module.exports = router;