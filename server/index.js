const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRoute = require('./routes/auth');
const usersRoute = require('./routes/users');
const userRoute = require('./routes/user');
const ticketsRoute = require('./routes/tickets');
const ticketRoute = require('./routes/ticket');
const moderationsRoute = require('./routes/moderations');
const moderationRoute = require('./routes/moderation');
const restricted = require('./middleware/restricted');
const restrictTo = require('./middleware/restrictTo');
const app = express();
const port = 3000;

dotenv.config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false }, () => {
    console.log('Connected to database');
});

app.use(express.json());

app.use('/api/auth', authRoute);
app.use('/api/users', restricted, restrictTo('admin', 'moderator'), usersRoute);
app.use('/api/user', restricted, userRoute);
app.use('/api/tickets', restricted, restrictTo('admin', 'moderator', 'support'), ticketsRoute);
app.use('/api/ticket', restricted, ticketRoute);
app.use('/api/moderations', restricted, restrictTo('admin'), moderationsRoute);
app.use('/api/moderation', restricted, restrictTo('admin', 'moderator'), moderationRoute);

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});