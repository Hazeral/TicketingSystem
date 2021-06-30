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



## Default permission groups

| Name          | Type | Default | Permissions                                                  | Total permissions |
| ------------- | ---- | ------- | ------------------------------------------------------------ | ----------------- |
| User          | add  | true    | VIEW_CURRENT_ACCOUNT_DETAILS<br>CHANGE_CURRENT_ACCOUNT_PASSWORD<br>CHANGE_CURRENT_ACCOUNT_EMAIL<br>VIEW_CURRENT_ACCOUNT_TICKETS<br>VIEW_TICKET<br>CREATE_TICKET<br>REPLY_TO_TICKET<br>CLOSE_TICKET<br>OPEN_TICKET | 25232933344       |
| Support       | add  | false   | Inherits "Users"<br>VIEW_TICKETS_BY_USER<br>VIEW_USER_DETAILS<br>VIEW_TICKETS<br>VIEW_TICKETS_BY_CATEGORY<br>VIEW_TICKETS_BY_PRIORITY<br>VIEW_OPEN_TICKETS<br>VIEW_CLOSED_TICKETS<br>CLOSE_TICKET_PERMANENTLY<br>CHANGE_TICKET_PRIORITY<br>CHANGE_TICKET_CATEGORY<br>VIEW_USER_NOTES<br>VIEW_TICKET_NOTES<br>CREATE_USER_NOTE<br>CREATE_TICKET_NOTE | 29824236128224    |
| Moderator     | add  | false   | Inherits "Support"<br>VIEW_USERS<br>VIEW_USERS_BY_IP<br>BLOCK_USERS_BY_IP<br>CHANGE_DETAILS_BY_USER<br>VIEW_MODERATIONS_BY_USER<br>BLOCK_USER<br>BLOCK_IP_BY_USER<br>MUTE_USER<br>VIEW_IPS_BY_USER<br>VIEW_SAMEIP_BY_USER<br>VIEW_MODERATION | 30374006269934    |
| Administrator | add  | false   | Has all permissions                                          | 72057594037927934 |



## API routes

| Route                              | Method | Description                                                  | Permission flag                                          | JSON Body                                                    |
| ---------------------------------- | ------ | ------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------ |
| /api/auth/register                 | POST   | Register account and return token                            | -                                                        | name: required<br>email: required<br>password: required      |
| /api/auth/login                    | POST   | Login to account and return token                            | -                                                        | email: required<br>password: required                        |
| /api/users                         | GET    | Get array of all users                                       | VIEW_USERS<br>1 << 1                                     | -                                                            |
| /api/users/ip/:ip                  | GET    | Get array of all users using specified IP                    | VIEW_USERS_BY_IP<br>1 << 2                               | -                                                            |
| /api/users/ip/:ip/block            | POST   | Block all users on an IP and block further accounts from being created | BLOCK_USERS_BY_IP<br>1 << 3                              | reason: required<br/>expires: optional (timestamp)           |
| /api/users/ip/:ip/unblock          | POST   | Unblock IP including all affected accounts                   | UNBLOCK_USERS_BY_IP<br>1 << 4                            | reason: required                                             |
| /api/user/@me                      | GET    | Get current account details                                  | VIEW_CURRENT_ACCOUNT_DETAILS<br>1 << 5                   | -                                                            |
| /api/user/@me/password             | PATCH  | Change password                                              | CHANGE_CURRENT_ACCOUNT_PASSWORD<br>1 << 6                | current_password: required<br>password: required             |
| /api/user/@me/email                | PATCH  | Change email                                                 | CHANGE_CURRENT_ACCOUNT_EMAIL<br>1 << 7                   | email: required                                              |
| /api/user/@me/tickets              | GET    | Get array of all tickets created by current account          | VIEW_CURRENT_ACCOUNT_TICKETS<br>1 << 8                   | -                                                            |
| /api/user/:id/tickets              | GET    | Get array of all tickets created by user                     | VIEW_TICKETS_BY_USER<br>1 << 9                           | -                                                            |
| /api/user/:id                      | GET    | Get user details                                             | VIEW_USER_DETAILS<br>1 << 10                             | -                                                            |
| /api/user/:id                      | DELETE | Delete user                                                  | DELETE_USER<br>1 << 11                                   | -                                                            |
| /api/user/:id/password             | PATCH  | Change user password                                         | CHANGE_PASSWORD_BY_USER<br>1 << 12                       | password: required                                           |
| /api/user/:id/details              | PATCH  | Change user name and email                                   | CHANGE_DETAILS_BY_USER<br>1 << 13                        | name: required<br>email: required                            |
| /api/user/:id/group                | PATCH  | Change user group (permission level)                         | CHANGE_GROUP_BY_USER<br>1 << 14                          | group: required<br>action: required (add, remove)            |
| /api/user/:id/moderations          | GET    | Get array of user's moderation log                           | VIEW_MODERATIONS_BY_USER<br>1 << 15                      | -                                                            |
| /api/user/:id/moderations/authored | GET    | Get array of user's authored moderations                     | VIEW_MODERATIONS_BY_AUTHOR<br>1 << 16                    | -                                                            |
| /api/user/:id/block                | POST   | Block an account (optional expiry)                           | BLOCK_USER<br>1 << 17                                    | reason: required<br>expires: optional (timestamp)            |
| /api/user/:id/unblock              | POST   | Unblock an account                                           | UNBLOCK_USER<br>1 << 18                                  | reason: required                                             |
| /api/user/:id/blockip              | POST   | Block user IP, all accounts on latest IP will be blocked, any new accounts made from the IP will also be blocked | BLOCK_IP_BY_USER<br>1 << 19                              | reason: required<br/>expires: optional (timestamp)           |
| /api/user/:id/mute                 | POST   | Mute an account (optional expiry)                            | MUTE_USER<br>1 << 20                                     | reason: required<br>expires: optional (timestamp)            |
| /api/user/:id/unmute               | POST   | Unmute an account                                            | UNMUTE_USER<br>1 << 21                                   | reason: required                                             |
| /api/user/:id/ips                  | GET    | Get list of IPs used with counter of how many times used     | VIEW_IPS_BY_USER<br>1 << 22                              | -                                                            |
| /api/user/:id/sameip               | GET    | Get list of all accounts using same IPs as user, will also list which IPs for each account | VIEW_SAMEIP_BY_USER<br>1 << 23                           | -                                                            |
| /api/tickets                       | GET    | Get array of all tickets                                     | VIEW_TICKETS<br>1 << 24                                  | -                                                            |
| /api/tickets/category/:category    | GET    | Get array of all tickets from specific category              | VIEW_TICKETS_BY_CATEGORY<br/>1 << 25                     | -                                                            |
| /api/tickets/priority/:priority    | GET    | Get array of all tickets with specific priority (low<br>medium<br>high) | VIEW_TICKETS_BY_PRIORITY<br>1 << 26                      | -                                                            |
| /api/tickets/open                  | GET    | Get array of all open tickets                                | VIEW_OPEN_TICKETS<br/>1 << 27                            | -                                                            |
| /api/tickets/closed                | GET    | Get array of all closed tickets                              | VIEW_CLOSED_TICKETS<br/>1 << 28                          | -                                                            |
| /api/ticket/:id                    | GET    | Get details about ticket                                     | VIEW_TICKET<br>1 << 29                                   | -                                                            |
| /api/ticket                        | POST   | Create ticket                                                | CREATE_TICKET<br>1 << 30<br>VIEW_TICKETS<br>1 << 24      | title: required<br>message: required                         |
| /api/ticket/:id/reply              | PATCH  | Reply to ticket                                              | REPLY_TO_TICKET<br/>1 << 31<br/>VIEW_TICKETS<br/>1 << 24 | message: required                                            |
| /api/ticket/:id/close              | PATCH  | Close ticket                                                 | CLOSE_TICKET<br/>1 << 32<br/>VIEW_TICKETS<br/>1 << 24    | -                                                            |
| /api/ticket/:id/close/permanently  | PATCH  | Close ticket permanently (user will not be able to reopen)   | CLOSE_TICKET_PERMANENTLY<br>1 << 33                      | -                                                            |
| /api/ticket/:id/open               | PATCH  | Reply to ticket                                              | OPEN_TICKET<br/>1 << 34<br/>VIEW_TICKETS<br/>1 << 24     | -                                                            |
| /api/ticket/:id/priority/:priority | PATCH  | Change ticket priority                                       | CHANGE_TICKET_PRIORITY<br>1 << 35                        | -                                                            |
| /api/ticket/:id/category/:category | PATCH  | Change ticket category                                       | CHANGE_TICKET_CATEGORY<br>1 << 36                        | -                                                            |
| /api/ticket/:id                    | DELETE | Delete ticket                                                | DELETE_TICKET<br>1 << 37                                 | -                                                            |
| /api/moderations                   | GET    | Get array of all moderations                                 | VIEW_MODERATIONS<br>1 << 38                              | -                                                            |
| /api/moderation/:id                | GET    | Get details of moderation                                    | VIEW_MODERATION<br>1 << 39                               | -                                                            |
| /api/notes/user/:id                | GET    | Get all notes on user                                        | VIEW_USER_NOTES<br>1 << 40                               | -                                                            |
| /api/notes/ticket/:id              | GET    | Get all notes on ticket                                      | VIEW_TICKET_NOTES<br>1 << 41                             | -                                                            |
| /api/notes/author/:id              | GET    | Get all notes created by author                              | VIEW_NOTES_BY_AUTHOR<br>1 << 42                          | -                                                            |
| /api/note/user/:id                 | POST   | Create note on user                                          | CREATE_USER_NOTE<br>1 << 43                              | content: required                                            |
| /api/note/ticket/:id               | POST   | Create note on ticket                                        | CREATE_TICKET_NOTE<br>1 << 44                            | content: required                                            |
| /api/note/:id                      | DELETE | Delete note                                                  | DELETE_NOTE<br>1 << 45                                   | -                                                            |
| /api/users/blocked                 | GET    | List all currently blocked users                             | VIEW_BLOCKED_USERS<br/>1 << 47                           | -                                                            |
| /api/users/muted                   | GET    | Listed all currently muted users                             | VIEW_MUTED_USERS<br/>1 << 48                             | -                                                            |
| /api/groups                        | GET    | List all groups                                              | VIEW_GROUPS<br/>1 << 49                                  | -                                                            |
| /api/group/:id                     | PATCH  | Edit group                                                   | EDIT_GROUP<br/>1 << 50                                   | name: optional<br>type: optional<br>permissions: optional<br>default: optional |
| /api/group                         | POST   | Create group                                                 | CREATE_GROUP<br/>1 << 51                                 | name: required<br/>permissions: required<br/>type: optional<br/>default: optional |
| /api/group/:id/users               | GET    | List all users with specified group                          | VIEW_USERS_BY_GROUP<br/>1 << 52                          | -                                                            |
| /api/groups/can/:flag              | GET    | List all groups with specified permission flag               | VIEW_GROUPS_BY_FLAG<br/>1 << 53                          | -                                                            |
| /api/group/:id                     | GET    | View group details                                           | VIEW_GROUP<br/>1 << 54                                   | -                                                            |
| /api/group/:id                     | DELETE | Delete group                                                 | DELETE_GROUP<br/>1 << 55                                 | -                                                            |
