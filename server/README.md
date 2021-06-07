# Server
To run the server you must first create a .env file that will hold all the credentials.

Template of .env file:
```
MONGO_URI = 
JWT_SIG = 
```

Install dependencies and run the server:

```bash
npm install
node index
```

## Modules used
- Express
- JSON Web Tokens
- Joi
- BCrypt
- Mongoose

## API routes
Route | Method | Description | Restriction | JSON Body
--- | --- | --- | --- | ---
/api/auth/register | POST | Register account and return token | - | name: required<br>email: required<br>password: required
/api/auth/login | POST | Login to account and return token | - | email: required, password: required
/api/users | GET | Get array of all users | admin, moderator | -
/api/user/@me | GET | Get current account details | user | -
/api/user/@me/password | PATCH | Change password | user | current_password: required, password: required
/api/user/@me/email | PATCH | Change email | user | email: required
/api/user/@me/tickets | GET | Get array of all tickets created by current account | user | -
/api/user/:id/tickets | GET | Get array of all tickets created by user | admin, moderator, support | -
/api/user/:id | GET | Get user details | admin, moderator, support | -
/api/user/:id | DELETE | Delete user | admin | -
/api/user/:id/password | PATCH | Change user password | admin | password: required
/api/user/:id/details | PATCH | Change user name and email | admin, moderator | name: required, email: required
/api/user/:id/group | PATCH | Change user group (permission level) | admin | group: required ('user', 'support', 'moderator', 'admin')
/api/user/:id/moderations | GET | Get array of user's moderation log | admin, moderator | -
/api/user/:id/moderations/authored | GET | Get array of user's authored moderations | admin | -
/api/user/:id/block | POST | Block an account (optional expiry) | admin, moderator | reason: required, expires: optional (timestamp)
/api/user/:id/unblock | POST | Unblock an account | admin | reason: required
/api/user/:id/mute | POST | Mute an account (optional expiry) | admin, moderator | reason: required, expires: optional (timestamp)
/api/user/:id/unmute | POST | Unmute an account | admin | reason: required
/api/tickets | GET | Get array of all tickets | admin, moderator, support | -
/api/tickets/category/:category | GET | Get array of all tickets from specific category | admin, moderator, support | -
/api/tickets/priority/:priority | GET | Get array of all tickets with specific priority (low, medium, high) | admin, moderator, support | -
/api/tickets/open | GET | Get array of all open tickets | admin, moderator, support | -
/api/tickets/closed | GET | Get array of all closed tickets | admin, moderator, support | -
/api/ticket/:id | GET | Get details about ticket | user (if author) | -
/api/ticket | POST | Create ticket | user | title: required, message: required
/api/ticket/:id/reply | PATCH | Reply to ticket | user (if author) | message: required
/api/ticket/:id/close | PATCH | Close ticket | user (if author) | -
/api/ticket/:id/close/permanently | PATCH | Close ticket permanently (user will not be able to reopen) | admin, moderator, support | -
/api/ticket/:id/open | PATCH | Reply to ticket | user (if author) | -
/api/ticket/:id/priority/:priority | PATCH | Change ticket priority | admin, moderator, support | -
/api/ticket/:id/category/:category | PATCH | Change ticket category | admin, moderator, support | -
/api/ticket/:id | DELETE | Delete ticket | admin | -
/api/moderations | GET | Get array of all moderations | admin | -
/api/moderation/:id | GET | Get details of moderation | admin, moderator | -
/api/notes/user/:id | GET | Get all notes on user | admin, moderator, support | -
/api/notes/ticket/:id | GET | Get all notes on ticket | admin, moderator, support | -
/api/notes/author/:id | GET | Get all notes created by author | admin | -
/api/note/user/:id | POST | Create note on user | admin, moderator, support | content: required
/api/note/ticket/:id | POST | Create note on ticket | admin, moderator, support | content: required
/api/note/:id | DELETE | Delete note | admin | -
