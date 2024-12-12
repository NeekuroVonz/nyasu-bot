const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    execute(member) {
        try {
            const channelId = '1003573612118286396';
            const channel = member.guild.channels.cache.get(channelId);

            if (!channel) {
                console.error('Welcome channel not found.');
                return;
            }

            // Create a welcome embed
            const embed = new EmbedBuilder()
                .setColor(0x7289da)
                .setTitle(`🎉 Welcome to ${member.guild.name}!`)
                .setDescription(`Hello <@${member.id}>, welcome to the server! 🎊\nWe're glad to have you here. Feel free to check out the rules and introduce yourself.`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `Member #${member.guild.memberCount}` })
                .setTimestamp();

            // Send the embed in the welcome channel
            channel.send({ embeds: [embed] });

            console.log(`Welcome message sent for ${member.user.tag}`);
        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    },
};
