const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // Set bot presence
        client.user.setPresence({ activities: [{ name: 'your mom!' }], status: 'idle' });

        console.log('Bot presence set!');
    },
};