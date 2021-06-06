const router = require('express').Router();
const { ObjectId } = require('mongoose').mongo;
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const restrictMuted = require('../middleware/restrictMuted');
const { createTicketValidation, replyTicketValidation } = require('../validation');

router.get('/:id', async (req, res) => {
    try {
        const ticket = await Ticket.findById(ObjectId(req.params.id)).populate({
            path: 'messages',
            populate: {
              path: 'author',
              select: { name: 1, group: 1 }
            }
         }).populate('author', { name: 1, group: 1 }).populate('closedBy', { name: 1, group: 1 }).populate('reopenedBy', { name: 1, group: 1 });
        if (ticket) {
            if (ticket.author == req.user.id || ['admin', 'moderator', 'support'].includes(req.user.group)) {
                if (ticket.author == req.user.id) {
                    await Ticket.updateOne({ _id: ticket._id }, { $set: { newReplyFromSupport: false } });
                } else {
                    await Ticket.updateOne({ _id: ticket._id }, { $set: { newReplyFromUser: false } });
                }

                res.json(ticket);
            } else {
                res.status(403).json({ error: 'Unauthorised' });
            }
        }
        else res.status(404).json({ error: 'Ticket not found' });
    } catch {
        res.status(400).json({ error: 'Ticket not found' });
    }
});

router.post('/', restrictMuted, async (req, res) => {
    const { error } = createTicketValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const ticket = new Ticket({
        title: req.body.title,
        author: req.user._id,
        messages: [{
            author: req.user._id,
            message: req.body.message
        }]
    });

    try {
        const savedTicket = await ticket.save();

        const newTicket = await Ticket.populate(savedTicket, [{
            path: 'messages',
            populate: {
              path: 'author',
              select: { name: 1, group: 1 }
            }
        }, { path: 'author', select: { name: 1, group: 1 } }]);

        res.json(newTicket);
    } catch(err) {
        res.status(400).json({ error: 'Could not create ticket' });
    }
});

router.patch('/:id', restrictMuted, async (req, res) => {
    const { error } = replyTicketValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        let ticket = await Ticket.findById(ObjectId(req.params.id));
        if (ticket) {
            if (ticket.author == req.user.id || ['admin', 'moderator', 'support'].includes(req.user.group)) {
                if (ticket.author == req.user.id) {
                    if (ticket.closed) {
                        return res.status(403).json({ error: 'Unauthorised' }); // Support can still reply
                    }
                    await Ticket.updateOne({ _id: ticket._id }, { $set: { newReplyFromSupport: false, newReplyFromUser: true } });
                } else {
                    await Ticket.updateOne({ _id: ticket._id }, { $set: { newReplyFromUser: false, newReplyFromSupport: true } });
                }
                
                ticket.messages.push({ author: req.user._id, message: req.body.message });
                const editedTicket = await Ticket.findByIdAndUpdate(ObjectId(req.params.id), { $set: { messages: ticket.messages } }).populate({
                    path: 'messages',
                    populate: {
                      path: 'author',
                      select: { name: 1, group: 1 }
                    }
                 }).populate('author', { name: 1, group: 1 }).populate('closedBy', { name: 1, group: 1 }).populate('reopenedBy', { name: 1, group: 1 });

                res.json(editedTicket);
            } else {
                res.status(403).json({ error: 'Unauthorised' });
            }
        }
        else res.status(404).json({ error: 'Ticket not found' });
    } catch {
        res.status(400).json({ error: 'Ticket not found' });
    }
});

router.patch('/:id/close', async (req, res) => {
    try {
        let ticket = await Ticket.findById(ObjectId(req.params.id));
        if (ticket) {
            if (ticket.author == req.user.id || ['admin', 'moderator', 'support'].includes(req.user.group)) {
                if (ticket.closed) return res.status(400).json({ error: 'Ticket already closed' });

                if (ticket.author == req.user.id) {
                    await Ticket.updateOne({ _id: ticket._id }, { $set: { newReplyFromSupport: false, newReplyFromUser: true } });
                } else {
                    await Ticket.updateOne({ _id: ticket._id }, { $set: { newReplyFromUser: false, newReplyFromSupport: true } });
                }
                
                const closedTicket = await Ticket.findByIdAndUpdate(ObjectId(req.params.id), { $set: { closed: true, closedBy: req.user._id, reopenedBy: null } });
                closedTicket.closed = true;
                closedTicket.closedBy = req.user._id;
                closedTicket.reopenedBy = null;
                const populatedTicket = await Ticket.populate(closedTicket, [{
                    path: 'messages',
                    populate: {
                      path: 'author',
                      select: { name: 1, group: 1 }
                    }
                }, { path:'author', select: { name: 1, group: 1 } }, { path:'closedBy', select: { name: 1, group: 1 } }]);

                res.json(populatedTicket);
            } else {
                res.status(403).json({ error: 'Unauthorised' });
            }
        }
        else res.status(404).json({ error: 'Ticket not found' });
    } catch {
        res.status(400).json({ error: 'Ticket not found' });
    }
});

router.patch('/:id/open', async (req, res) => {
    try {
        let ticket = await Ticket.findById(ObjectId(req.params.id));
        if (ticket) {
            if (ticket.author == req.user.id || ['admin', 'moderator', 'support'].includes(req.user.group)) {
                if (!ticket.closed) return res.status(400).json({ error: 'Ticket already open' });

                if (ticket.author == req.user.id) {
                    await Ticket.updateOne({ _id: ticket._id }, { $set: { newReplyFromSupport: false, newReplyFromUser: true } });
                } else {
                    await Ticket.updateOne({ _id: ticket._id }, { $set: { newReplyFromUser: false, newReplyFromSupport: true } });
                }
                
                const closedTicket = await Ticket.findByIdAndUpdate(ObjectId(req.params.id), { $set: { closed: false, closedBy: null, reopenedBy: req.user.id } });
                closedTicket.closed = false;
                closedTicket.closedBy = null;
                closedTicket.reopenedBy = req.user._id;
                const populatedTicket = await Ticket.populate(closedTicket, [{
                    path: 'messages',
                    populate: {
                      path: 'author',
                      select: { name: 1, group: 1 }
                    }
                }, { path:'author', select: { name: 1, group: 1 } }, { path:'reopenedBy', select: { name: 1, group: 1 } }]);

                res.json(populatedTicket);
            } else {
                res.status(403).json({ error: 'Unauthorised' });
            }
        }
        else res.status(404).json({ error: 'Ticket not found' });
    } catch {
        res.status(400).json({ error: 'Ticket not found' });
    }
});

module.exports = router;