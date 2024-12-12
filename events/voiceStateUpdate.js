const { Events, PermissionsBitField, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        try {
            // Check if the user joined the 'Create Temp Channel' voice channel
            if (oldState.channelId !== '1315746494200025129' && newState.channelId === '1315746494200025129') {
                console.log(newState.member.user);
                // Create a temporary voice channel for the user
                const tempChannel = await newState.guild.channels.create({
                    name: `${newState.member.user.displayName}'s Channel`,
                    type: ChannelType.GuildVoice,
                    permissionOverwrites: [
                        {
                            id: newState.guild.id, // Default permissions for the entire guild
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: newState.member.id, // Give the user permission
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ManageChannels],
                        },
                    ],
                });

                // Move the user to the newly created temporary voice channel
                await newState.setChannel(tempChannel);

                // Send a dashboard message in the text channel
                const embed = new EmbedBuilder()
                    .setColor(0x7289da)
                    .setTitle(`Temporary Voice Channel Settings for ${newState.member.user.username}`)
                    .setDescription(`This is your temporary voice channel. Use the buttons below to modify the settings.`)
                    .addFields(
                        { name: 'Channel Name', value: `Current name: ${tempChannel.name}`, inline: true },
                        { name: 'Privacy', value: `Currently private (only you can see it).`, inline: true }
                    )
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('change_name')
                        .setLabel('Change Name')
                        .setStyle('Primary'),
                    new ButtonBuilder()
                        .setCustomId('change_privacy')
                        .setLabel('Change Privacy')
                        .setStyle('Primary')
                );

                await tempChannel.send({
                    content: `Welcome to your temporary voice channel, <@${newState.member.user.id}>!`,
                    embeds: [embed],
                    components: [row],
                });

                // Handle button interactions in the settings text channel
                const filter = (interaction) => interaction.user.id === newState.member.id;
                const collector = tempChannel.createMessageComponentCollector({ filter, time: 600000 }); // Collect for 10 minutes

                collector.on('collect', async (interaction) => {
                    if (interaction.customId === 'change_name') {
                        await interaction.reply({ content: 'Please enter a new name for your voice channel:', ephemeral: true });
                        const nameCollector = tempChannel.createMessageCollector({ time: 60000 }); // Collect for 1 minute
                        nameCollector.on('collect', async (newNameMessage) => {
                            const newName = newNameMessage.content.trim();
                            if (newName) {
                                await tempChannel.setName(newName);
                                await interaction.followUp({ content: `Voice channel name updated to: ${newName}`, ephemeral: true });
                            } else {
                                await interaction.followUp({ content: 'Invalid channel name. Please try again.', ephemeral: true });
                            }
                            nameCollector.stop();
                        });
                    }

                    if (interaction.customId === 'change_privacy') {
                        // Find the permission overwrite for the guild's default permissions
                        const guildPermissionOverwrite = tempChannel.permissionOverwrites.get(newState.guild.id);

                        if (!guildPermissionOverwrite) {
                            console.error("No permission overwrite found for the guild.");
                            return;
                        }

                        const currentPrivacy = guildPermissionOverwrite.deny.has(PermissionsBitField.Flags.ViewChannel) ? 'private' : 'public';
                        const newPrivacy = currentPrivacy === 'private' ? 'public' : 'private';

                        // Update privacy
                        if (newPrivacy === 'public') {
                            await guildPermissionOverwrite.update({
                                allow: [PermissionsBitField.Flags.ViewChannel],
                            });
                        } else {
                            await guildPermissionOverwrite.update({
                                deny: [PermissionsBitField.Flags.ViewChannel],
                            });
                        }

                        await interaction.followUp({ content: `Voice channel privacy updated to: ${newPrivacy}`, ephemeral: true });
                    }
                });

                collector.on('end', async () => {
                    try {
                        await tempChannel.send('Your temporary voice channel settings dashboard has expired.');
                    } catch (error) {
                        console.error('Failed to send expiration message:', error);
                    }
                });
            }
        } catch (error) {
            console.error('Error during voiceStateUpdate event:', error);
        }
    },
};