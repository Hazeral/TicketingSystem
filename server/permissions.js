const User = require('./models/User');

module.exports.flags = {
    VIEW_USERS: 1n << 1n,
    VIEW_USERS_BY_IP: 1n << 2n,
    BLOCK_USERS_BY_IP: 1n << 3n,
    UNBLOCK_USERS_BY_IP: 1n << 4n,
    VIEW_CURRENT_ACCOUNT_DETAILS: 1n << 5n,
    CHANGE_CURRENT_ACCOUNT_PASSWORD: 1n << 6n,
    CHANGE_CURRENT_ACCOUNT_EMAIL: 1n << 7n,
    VIEW_CURRENT_ACCOUNT_TICKETS: 1n << 8n,
    VIEW_TICKETS_BY_USER: 1n << 9n,
    VIEW_USER_DETAILS: 1n << 10n,
    DELETE_USER: 1n << 11n,
    CHANGE_PASSWORD_BY_USER: 1n << 12n,
    CHANGE_DETAILS_BY_USER: 1n << 13n,
    CHANGE_GROUP_BY_USER: 1n << 14n,
    VIEW_MODERATIONS_BY_USER: 1n << 15n,
    VIEW_MODERATIONS_BY_AUTHOR: 1n << 16n,
    BLOCK_USER: 1n << 17n,
    UNBLOCK_USER: 1n << 18n,
    BLOCK_IP_BY_USER: 1n << 19n,
    MUTE_USER: 1n << 20n,
    UNMUTE_USER: 1n << 21n,
    VIEW_IPS_BY_USER: 1n << 22n,
    VIEW_SAMEIP_BY_USER: 1n << 23n,
    VIEW_TICKETS: 1n << 24n,
    VIEW_TICKETS_BY_CATEGORY: 1n << 25n,
    VIEW_TICKETS_BY_PRIORITY: 1n << 26n,
    VIEW_OPEN_TICKETS: 1n << 27n,
    VIEW_CLOSED_TICKETS: 1n << 28n,
    VIEW_TICKET: 1n << 29n,
    CREATE_TICKET: 1n << 30n,
    REPLY_TO_TICKET: 1n << 31n,
    CLOSE_TICKET: 1n << 32n,
    CLOSE_TICKET_PERMANENTLY: 1n << 33n,
    OPEN_TICKET: 1n << 34n,
    CHANGE_TICKET_PRIORITY: 1n << 35n,
    CHANGE_TICKET_CATEGORY: 1n << 36n,
    DELETE_TICKET: 1n << 37n,
    VIEW_MODERATIONS: 1n << 38n,
    VIEW_MODERATION: 1n << 39n,
    VIEW_USER_NOTES: 1n << 40n,
    VIEW_TICKET_NOTES: 1n << 41n,
    VIEW_NOTES_BY_AUTHOR: 1n << 42n,
    CREATE_USER_NOTE: 1n << 43n,
    CREATE_TICKET_NOTE: 1n << 44n,
    DELETE_NOTE: 1n << 45n,
    IMMUNITY: 1n << 46n,
    VIEW_BLOCKED_USERS: 1n << 47n,
    VIEW_MUTED_USERS: 1n << 48n,
    VIEW_GROUPS: 1n << 49n,
    EDIT_GROUP: 1n << 50n,
    CREATE_GROUP: 1n << 51n,
    VIEW_USERS_BY_GROUP: 1n << 52n,
    VIEW_GROUPS_BY_FLAG: 1n << 53n,
    VIEW_GROUP: 1n << 54n,
    DELETE_GROUP: 1n << 55n
};

module.exports.max = () => {
    return Object.values(this.flags).reduce(
        (total, current) => total | current,
        0n
    );
};

module.exports.total = (groups) => {
    // returns bitmask
    // groups is an array of objects which should contain properties: type and permissions

    const sorted = groups.sort((a, b) =>
        a.type != 'remove' ? -1 : b.type != 'remove' ? 1 : 0
    );

    let total = 0n;

    for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].type == 'remove') {
            total &= ~BigInt(sorted[i].permissions);
        } else {
            total |= BigInt(sorted[i].permissions);
        }
    }

    return total;
};

module.exports.userHas = async (userID, flag) => {
    const user = await User.findById(userID).populate('groups');
    return this.total(user.groups) & flag;
};

// add other permission calc functions

// for (key in this.flags) {
//     if (perms & this.flags[key]) console.log(key);
// }

// WHEN CREATING GROUP AND OPTION TO COPY OTHER GROUP PERMISSIONS (MAINLY FRONT END)
// instead of restricting mods from modifying admins, now restrict from modifying anyone with immunity flag
