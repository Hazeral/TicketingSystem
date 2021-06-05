const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRoute = require('./routes/auth');
const usersRoute = require('./routes/users');
const userRoute = require('./routes/user');
const restrict = require('./middleware/restrict');
const restrictTo = require('./middleware/restrictTo');
const app = express();
const port = 3000;

dotenv.config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }, () => {
    console.log('Connected to database');
});

app.use(express.json());

app.use('/api/auth', authRoute);
app.use('/api/users', restrict, restrictTo('admin', 'moderator'), usersRoute);
app.use('/api/user', restrict, userRoute);

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});