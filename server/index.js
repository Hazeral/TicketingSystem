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
const notesRoute = require('./routes/notes');
const noteRoute = require('./routes/note');
const groupsRoute = require('./routes/groups');
const groupRoute = require('./routes/group');
const restricted = require('./middleware/restricted');
const Group = require('./models/Group');
const permissions = require('./permissions');
const app = express();
const port = 3000;

dotenv.config();

mongoose.connect(
    process.env.MONGO_URI,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false
    },
    async () => {
        console.log('Connected to database');

        const groups = await Group.find({});
        if (groups.length < 1) {
            const UserGroup = new Group({
                name: 'User',
                permissions:
                    permissions.flags.VIEW_CURRENT_ACCOUNT_DETAILS |
                    permissions.flags.CHANGE_CURRENT_ACCOUNT_PASSWORD |
                    permissions.flags.CHANGE_CURRENT_ACCOUNT_EMAIL |
                    permissions.flags.VIEW_CURRENT_ACCOUNT_TICKETS |
                    permissions.flags.VIEW_TICKET |
                    permissions.flags.CREATE_TICKET |
                    permissions.flags.REPLY_TO_TICKET |
                    permissions.flags.CLOSE_TICKET |
                    permissions.flags.OPEN_TICKET,
                default: true
            });
            const SupportGroup = new Group({
                name: 'Support',
                permissions:
                    BigInt(UserGroup.permissions) |
                    permissions.flags.VIEW_TICKETS_BY_USER |
                    permissions.flags.VIEW_USER_DETAILS |
                    permissions.flags.VIEW_TICKETS |
                    permissions.flags.VIEW_TICKETS_BY_CATEGORY |
                    permissions.flags.VIEW_TICKETS_BY_PRIORITY |
                    permissions.flags.VIEW_OPEN_TICKETS |
                    permissions.flags.VIEW_CLOSED_TICKETS |
                    permissions.flags.CLOSE_TICKET_PERMANENTLY |
                    permissions.flags.CHANGE_TICKET_PRIORITY |
                    permissions.flags.CHANGE_TICKET_CATEGORY |
                    permissions.flags.VIEW_USER_NOTES |
                    permissions.flags.VIEW_TICKET_NOTES |
                    permissions.flags.CREATE_USER_NOTE |
                    permissions.flags.CREATE_TICKET_NOTE
            });
            const ModeratorGroup = new Group({
                name: 'Moderator',
                permissions:
                    BigInt(SupportGroup.permissions) |
                    permissions.flags.VIEW_USERS |
                    permissions.flags.VIEW_USERS_BY_IP |
                    permissions.flags.BLOCK_USERS_BY_IP |
                    permissions.flags.CHANGE_DETAILS_BY_USER |
                    permissions.flags.VIEW_MODERATIONS_BY_USER |
                    permissions.flags.BLOCK_USER |
                    permissions.flags.BLOCK_IP_BY_USER |
                    permissions.flags.MUTE_USER |
                    permissions.flags.VIEW_IPS_BY_USER |
                    permissions.flags.VIEW_SAMEIP_BY_USER |
                    permissions.flags.VIEW_MODERATION
            });
            const AdministratorGroup = new Group({
                name: 'Administrator',
                permissions: permissions.max()
            });

            console.log('Creating default groups...');

            const groups = await Group.insertMany([
                UserGroup,
                SupportGroup,
                ModeratorGroup,
                AdministratorGroup
            ]);

            console.log('Finished creating default groups');
            console.log(groups);
        }
    }
);

app.use(express.json());

app.use('/api/auth', authRoute);
app.use('/api/users', restricted, usersRoute);
app.use('/api/user', restricted, userRoute);
app.use('/api/tickets', restricted, ticketsRoute);
app.use('/api/ticket', restricted, ticketRoute);
app.use('/api/moderations', moderationsRoute);
app.use('/api/moderation', restricted, moderationRoute);
app.use('/api/notes', restricted, notesRoute);
app.use('/api/note', restricted, noteRoute);
app.use('/api/groups', restricted, groupsRoute);
app.use('/api/group', restricted, groupRoute);

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
