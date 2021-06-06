const router = require('express').Router();
const Ticket = require('../models/Ticket');

router.get('/', async (req, res) => {
    const tickets = await Ticket.find({}).select({ "messages": 0, "newReplyFromSupport": 0 })
    .populate('author', { name: 1, group: 1 })
    .populate('closedBy', { name: 1, group: 1 })
    .populate('reopenedBy', { name: 1, group: 1 });

    res.json(tickets);
});

module.exports = router;