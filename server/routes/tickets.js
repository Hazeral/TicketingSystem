const router = require('express').Router();
const Ticket = require('../models/Ticket');

router.get('/', async (req, res) => {
    const tickets = await Ticket.find({}).select({ "messages": 0, "logs": 0 })
    .populate('author', { name: 1, group: 1 })
    .populate({
        path: 'logs',
        populate: {
          path: 'author',
          select: { name: 1, group: 1 }
        }
    });

    res.json(tickets);
});

router.get('/category/:category', async (req, res) => {
    try {
        if (req.params.category == "") return res.status(400).json({ error: 'No category provided' });

        const tickets = await Ticket.find({ category: req.params.category }).select({ "messages": 0, "logs": 0 })
        .populate('author', { name: 1, group: 1 })
        .populate({
            path: 'logs',
            populate: {
              path: 'author',
              select: { name: 1, group: 1 }
            }
        });
    
        res.json(tickets);
    } catch {
        res.status(400).json({ error: 'Could not retrieve tickets' });
    }
});

router.get('/priority/:priority', async (req, res) => {
    try {
        if (!['low', 'medium', 'high'].includes(req.params.priority)) return res.status(400).json({ error: 'Invalid priority tag' });

        const tickets = await Ticket.find({ priority: req.params.priority }).select({ "messages": 0, "logs": 0 })
        .populate('author', { name: 1, group: 1 })
        .populate({
            path: 'logs',
            populate: {
              path: 'author',
              select: { name: 1, group: 1 }
            }
        });
    
        res.json(tickets);
    } catch {
        res.status(400).json({ error: 'Could not retrieve tickets' });
    }
});

router.get('/open', async (req, res) => {
    try {
        const tickets = await Ticket.find({ status: 'open' }).select({ "messages": 0, "logs": 0 })
        .populate('author', { name: 1, group: 1 })
        .populate({
            path: 'logs',
            populate: {
              path: 'author',
              select: { name: 1, group: 1 }
            }
        });
    
        res.json(tickets);
    } catch {
        res.status(400).json({ error: 'Could not retrieve tickets' });
    }
});

router.get('/closed', async (req, res) => {
    try {
        const tickets = await Ticket.find({ status: {$in: ['closed', 'closed_permanently'] } }).select({ "messages": 0, "logs": 0 })
        .populate('author', { name: 1, group: 1 })
        .populate({
            path: 'logs',
            populate: {
              path: 'author',
              select: { name: 1, group: 1 }
            }
        });
    
        res.json(tickets);
    } catch {
        res.status(400).json({ error: 'Could not retrieve tickets' });
    }
});

module.exports = router;