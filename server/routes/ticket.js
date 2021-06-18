const router = require('express').Router();
const { ObjectId } = require('mongoose').mongo;
const Ticket = require('../models/Ticket');
const can = require('../middleware/can');
const restrictMuted = require('../middleware/restrictMuted');
const {
    createTicketValidation,
    replyTicketValidation
} = require('../validation');
const { flags } = require('../permissions');

router.get('/:id', can(flags.VIEW_TICKET), async (req, res) => {
    try {
        const ticket = await Ticket.findById(ObjectId(req.params.id))
            .populate({
                path: 'messages',
                populate: {
                    path: 'author',
                    select: { name: 1, group: 1 }
                }
            })
            .populate({
                path: 'logs',
                populate: {
                    path: 'author',
                    select: { name: 1, group: 1 }
                }
            })
            .populate('author', { name: 1, group: 1 });
        if (ticket) {
            if (
                ticket.author._id == req.user.id ||
                ['admin', 'moderator', 'support'].includes(req.user.group)
            ) {
                if (ticket.author._id == req.user.id) {
                    await Ticket.updateOne(
                        { _id: ticket._id },
                        { $set: { 'newReply.fromSupport': false } }
                    );
                    ticket.newReply.fromSupport = false;
                } else {
                    await Ticket.updateOne(
                        { _id: ticket._id },
                        { $set: { 'newReply.fromUser': false } }
                    );
                    ticket.newReply.fromUser = false;
                }

                res.json(ticket);
            } else {
                res.status(403).json({ error: 'Unauthorised' });
            }
        } else res.status(404).json({ error: 'Ticket not found' });
    } catch {
        res.status(400).json({ error: 'Ticket not found' });
    }
});

router.post('/', can(flags.CREATE_TICKET), restrictMuted, async (req, res) => {
    const { error } = createTicketValidation(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const ticket = new Ticket({
        title: req.body.title,
        author: req.user._id,
        messages: [
            {
                author: req.user._id,
                message: req.body.message
            }
        ],
        logs: [
            {
                author: req.user._id,
                action: 'create'
            }
        ]
    });

    try {
        const savedTicket = await ticket.save();

        const newTicket = await Ticket.populate(savedTicket, [
            {
                path: 'messages',
                populate: {
                    path: 'author',
                    select: { name: 1, group: 1 }
                }
            },
            {
                path: 'logs',
                populate: {
                    path: 'author',
                    select: { name: 1, group: 1 }
                }
            },
            { path: 'author', select: { name: 1, group: 1 } }
        ]);

        res.json(newTicket);
    } catch (err) {
        res.status(400).json({ error: 'Could not create ticket' });
    }
});

router.patch(
    '/:id/reply',
    can(flags.REPLY_TO_TICKET),
    restrictMuted,
    async (req, res) => {
        const { error } = replyTicketValidation(req.body);
        if (error)
            return res.status(400).json({ error: error.details[0].message });

        try {
            let ticket = await Ticket.findById(ObjectId(req.params.id));
            if (ticket) {
                if (
                    ticket.author._id == req.user.id ||
                    ['admin', 'moderator', 'support'].includes(req.user.group)
                ) {
                    if (ticket.author._id == req.user.id) {
                        if (
                            ['closed', 'closed_permanently'].includes(
                                ticket.status
                            )
                        ) {
                            return res
                                .status(403)
                                .json({ error: 'Unauthorised' }); // Support can still reply
                        }
                        await Ticket.updateOne(
                            { _id: ticket._id },
                            {
                                $set: {
                                    newReply: {
                                        fromSupport: false,
                                        fromUser: true
                                    }
                                }
                            }
                        );
                    } else {
                        await Ticket.updateOne(
                            { _id: ticket._id },
                            {
                                $set: {
                                    newReply: {
                                        fromSupport: true,
                                        fromUser: false
                                    }
                                }
                            }
                        );
                    }

                    ticket.messages.push({
                        author: req.user._id,
                        message: req.body.message
                    });
                    const editedTicket = await Ticket.findByIdAndUpdate(
                        ObjectId(req.params.id),
                        { $set: { messages: ticket.messages } }
                    );
                    editedTicket.messages = ticket.messages;
                    const populatedTicket = await Ticket.populate(
                        editedTicket,
                        [
                            {
                                path: 'messages',
                                populate: {
                                    path: 'author',
                                    select: { name: 1, group: 1 }
                                }
                            },
                            {
                                path: 'logs',
                                populate: {
                                    path: 'author',
                                    select: { name: 1, group: 1 }
                                }
                            },
                            { path: 'author', select: { name: 1, group: 1 } }
                        ]
                    );

                    res.json(populatedTicket);
                } else {
                    res.status(403).json({ error: 'Unauthorised' });
                }
            } else res.status(404).json({ error: 'Ticket not found' });
        } catch {
            res.status(400).json({ error: 'Ticket not found' });
        }
    }
);

router.patch('/:id/close', can(flags.CLOSE_TICKET), async (req, res) => {
    try {
        let ticket = await Ticket.findById(ObjectId(req.params.id));
        if (ticket) {
            if (
                ticket.author._id == req.user.id ||
                ['admin', 'moderator', 'support'].includes(req.user.group)
            ) {
                if (['closed', 'closed_permanently'].includes(ticket.status))
                    return res
                        .status(400)
                        .json({ error: 'Ticket already closed' });

                if (ticket.author._id == req.user.id) {
                    await Ticket.updateOne(
                        { _id: ticket._id },
                        {
                            $set: {
                                newReply: { fromSupport: false, fromUser: true }
                            }
                        }
                    );
                } else {
                    await Ticket.updateOne(
                        { _id: ticket._id },
                        {
                            $set: {
                                newReply: { fromSupport: true, fromUser: false }
                            }
                        }
                    );
                }

                ticket.logs.push({
                    author: req.user._id,
                    action: 'close'
                });
                const closedTicket = await Ticket.findByIdAndUpdate(
                    ObjectId(req.params.id),
                    { $set: { logs: ticket.logs, status: 'closed' } }
                );
                closedTicket.logs = ticket.logs;
                closedTicket.status = 'closed';
                const populatedTicket = await Ticket.populate(closedTicket, [
                    {
                        path: 'messages',
                        populate: {
                            path: 'author',
                            select: { name: 1, group: 1 }
                        }
                    },
                    {
                        path: 'logs',
                        populate: {
                            path: 'author',
                            select: { name: 1, group: 1 }
                        }
                    },
                    { path: 'author', select: { name: 1, group: 1 } }
                ]);

                res.json(populatedTicket);
            } else {
                res.status(403).json({ error: 'Unauthorised' });
            }
        } else res.status(404).json({ error: 'Ticket not found' });
    } catch {
        res.status(400).json({ error: 'Ticket not found' });
    }
});

router.patch(
    '/:id/close/permanently',
    can(flags.CLOSE_TICKET_PERMANENTLY),
    async (req, res) => {
        try {
            let ticket = await Ticket.findById(ObjectId(req.params.id));
            if (ticket) {
                if (ticket.status == 'closed_permanently')
                    return res
                        .status(400)
                        .json({ error: 'Ticket already permanently closed' });

                await Ticket.updateOne(
                    { _id: ticket._id },
                    {
                        $set: {
                            newReply: { fromSupport: true, fromUser: false }
                        }
                    }
                );

                ticket.logs.push({
                    author: req.user._id,
                    action: 'close_permanently'
                });
                const closedTicket = await Ticket.findByIdAndUpdate(
                    ObjectId(req.params.id),
                    {
                        $set: {
                            logs: ticket.logs,
                            status: 'closed_permanently'
                        }
                    }
                );
                closedTicket.logs = ticket.logs;
                closedTicket.status = 'closed_permanently';
                const populatedTicket = await Ticket.populate(closedTicket, [
                    {
                        path: 'messages',
                        populate: {
                            path: 'author',
                            select: { name: 1, group: 1 }
                        }
                    },
                    {
                        path: 'logs',
                        populate: {
                            path: 'author',
                            select: { name: 1, group: 1 }
                        }
                    },
                    { path: 'author', select: { name: 1, group: 1 } }
                ]);

                res.json(populatedTicket);
            } else res.status(404).json({ error: 'Ticket not found' });
        } catch {
            res.status(400).json({ error: 'Ticket not found' });
        }
    }
);

router.patch('/:id/open', can(flags.OPEN_TICKET), async (req, res) => {
    try {
        let ticket = await Ticket.findById(ObjectId(req.params.id));
        if (ticket) {
            if (
                ticket.author._id == req.user.id ||
                ['admin', 'moderator', 'support'].includes(req.user.group)
            ) {
                if (ticket.status == 'open')
                    return res
                        .status(400)
                        .json({ error: 'Ticket already open' });

                if (ticket.author._id == req.user.id) {
                    if (ticket.status == 'closed_permanently')
                        return res.status(403).json({ error: 'Unauthorised' });
                    await Ticket.updateOne(
                        { _id: ticket._id },
                        {
                            $set: {
                                newReply: { fromSupport: false, fromUser: true }
                            }
                        }
                    );
                } else {
                    await Ticket.updateOne(
                        { _id: ticket._id },
                        {
                            $set: {
                                newReply: { fromSupport: true, fromUser: false }
                            }
                        }
                    );
                }

                ticket.logs.push({
                    author: req.user._id,
                    action: 'open'
                });
                const closedTicket = await Ticket.findByIdAndUpdate(
                    ObjectId(req.params.id),
                    { $set: { logs: ticket.logs, status: 'open' } }
                );
                closedTicket.logs = ticket.logs;
                closedTicket.status = 'open';
                const populatedTicket = await Ticket.populate(closedTicket, [
                    {
                        path: 'messages',
                        populate: {
                            path: 'author',
                            select: { name: 1, group: 1 }
                        }
                    },
                    {
                        path: 'logs',
                        populate: {
                            path: 'author',
                            select: { name: 1, group: 1 }
                        }
                    },
                    { path: 'author', select: { name: 1, group: 1 } }
                ]);

                res.json(populatedTicket);
            } else {
                res.status(403).json({ error: 'Unauthorised' });
            }
        } else res.status(404).json({ error: 'Ticket not found' });
    } catch {
        res.status(400).json({ error: 'Ticket not found' });
    }
});

router.patch(
    '/:id/priority/:priority',
    can(flags.CHANGE_TICKET_PRIORITY),
    async (req, res) => {
        try {
            if (!['low', 'medium', 'high'].includes(req.params.priority))
                return res.status(400).json({ error: 'Invalid priority tag' });

            let ticket = await Ticket.findById(ObjectId(req.params.id));
            if (ticket) {
                ticket.logs.push({
                    author: req.user._id,
                    action: 'change_priority',
                    info: `${ticket.priority} => ${req.params.priority}`
                });
                const updatedTicket = await Ticket.findByIdAndUpdate(
                    ObjectId(req.params.id),
                    {
                        $set: {
                            logs: ticket.logs,
                            priority: req.params.priority
                        }
                    }
                );
                updatedTicket.priority = req.params.priority;
                updatedTicket.logs = ticket.logs;
                const populatedTicket = await Ticket.populate(updatedTicket, [
                    {
                        path: 'messages',
                        populate: {
                            path: 'author',
                            select: { name: 1, group: 1 }
                        }
                    },
                    {
                        path: 'logs',
                        populate: {
                            path: 'author',
                            select: { name: 1, group: 1 }
                        }
                    },
                    { path: 'author', select: { name: 1, group: 1 } }
                ]);

                res.json(populatedTicket);
            } else res.status(404).json({ error: 'Ticket not found' });
        } catch {
            res.status(400).json({ error: 'Ticket not found' });
        }
    }
);

router.patch(
    '/:id/category/:category',
    can(flags.CHANGE_TICKET_CATEGORY),
    async (req, res) => {
        try {
            if (req.params.category == '')
                return res.status(400).json({ error: 'No category provided' });

            let ticket = await Ticket.findById(ObjectId(req.params.id));
            if (ticket) {
                ticket.logs.push({
                    author: req.user._id,
                    action: 'change_category',
                    info: `${ticket.category} => ${req.params.category}`
                });
                const updatedTicket = await Ticket.findByIdAndUpdate(
                    ObjectId(req.params.id),
                    {
                        $set: {
                            logs: ticket.logs,
                            category: req.params.category
                        }
                    }
                );
                updatedTicket.category = req.params.category;
                updatedTicket.logs = ticket.logs;
                const populatedTicket = await Ticket.populate(updatedTicket, [
                    {
                        path: 'messages',
                        populate: {
                            path: 'author',
                            select: { name: 1, group: 1 }
                        }
                    },
                    {
                        path: 'logs',
                        populate: {
                            path: 'author',
                            select: { name: 1, group: 1 }
                        }
                    },
                    { path: 'author', select: { name: 1, group: 1 } }
                ]);

                res.json(populatedTicket);
            } else res.status(404).json({ error: 'Ticket not found' });
        } catch {
            res.status(400).json({ error: 'Ticket not found' });
        }
    }
);

router.delete('/:id', can(flags.DELETE_TICKET), async (req, res) => {
    try {
        const ticket = await Ticket.findByIdAndDelete(
            ObjectId(req.params.id)
        ).select({ messages: 0 });

        const populatedTicket = await Ticket.populate(ticket, [
            { path: 'author', select: { name: 1, group: 1 } }
        ]);
        if (ticket) res.json(populatedTicket);
        else res.status(404).json({ error: 'Ticket not found' });
    } catch {
        res.status(400).json({ error: 'Ticket not found' });
    }
});

module.exports = router;
