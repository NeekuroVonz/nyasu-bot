const { Events, PermissionsBitField, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Example of a trigger to create a temporary voice channel
        if (message.content === '!createvc') {
            const channel = await message.guild.channels.create({
                name: `Temp Voice Channel - ${message.author.username}`,
                type: 2, // type 2 means voice channel
                parent: null, // No category
                permissionOverwrites: [
                    {
                        id: message.guild.id, // Default permission for the entire server
                        deny: [PermissionsBitField.Flags.ViewChannel], // Make it invisible to others initially
                    },
                    {
                        id: message.author.id, // Give the user access
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
                    },
                ],
            });

            // Create a text channel linked to the voice channel for settings
            const textChannel = await message.guild.channels.create({
                name: `${channel.name}-settings`,
                type: 0, // type 0 means text channel
                parent: null,
                permissionOverwrites: [
                    {
                        id: message.guild.id, // Default permission for the entire server
                        deny: [PermissionsBitField.Flags.ViewChannel], // Make it invisible to others initially
                    },
                    {
                        id: message.author.id, // Give the user access to the text channel
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                    },
                ],
            });

            // Create a dashboard with buttons to interact with the voice channel
            const embed = new EmbedBuilder()
                .setColor(0x7289da)
                .setTitle('Temporary Voice Channel Settings')
                .setDescription('Use the buttons below to customize your temporary voice channel.')
                .addFields(
                    { name: 'Channel Name', value: `Current name: ${channel.name}`, inline: true },
                    { name: 'Privacy', value: `Currently private.`, inline: true }
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
                    .setStyle('Primary'),
                new ButtonBuilder()
                    .setCustomId('change_region')
                    .setLabel('Change Region')
                    .setStyle('Primary')
            );

            await textChannel.send({
                content: `Welcome to your temporary voice channel! ${message.author.username}`,
                embeds: [embed],
                components: [row],
            });

            // Listen for button interactions
            const filter = (interaction) => interaction.user.id === message.author.id; // Only the user who created the VC can interact
            const collector = textChannel.createMessageComponentCollector({ filter, time: 600000 }); // Collect interactions for 10 minutes

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'change_name') {
                    await interaction.reply('Please type the new name for the voice channel.');
                    const nameCollector = textChannel.createMessageCollector({ time: 60000 }); // Collect the name change
                    nameCollector.on('collect', async (newNameMessage) => {
                        await channel.setName(newNameMessage.content);
                        await interaction.followUp(`Voice channel name updated to: ${newNameMessage.content}`);
                        nameCollector.stop();
                    });
                }

                if (interaction.customId === 'change_privacy') {
                    const currentPrivacy = channel.permissionOverwrites.get(message.guild.id).deny.has(PermissionsBitField.Flags.ViewChannel) ? 'private' : 'public';
                    const newPrivacy = currentPrivacy === 'private' ? 'public' : 'private';

                    if (newPrivacy === 'public') {
                        await channel.permissionOverwrites.get(message.guild.id).update({
                            allow: [PermissionsBitField.Flags.ViewChannel],
                        });
                    } else {
                        await channel.permissionOverwrites.get(message.guild.id).update({
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        });
                    }

                    await interaction.followUp(`Voice channel privacy updated to: ${newPrivacy}`);
                }

                if (interaction.customId === 'change_region') {
                    const regions = ['us-west', 'us-east', 'eu-west']; // Example regions
                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId('region_select')
                        .setPlaceholder('Select a new region')
                        .addOptions(
                            regions.map((region) => ({
                                label: region,
                                value: region,
                            }))
                        );

                    const regionRow = new ActionRowBuilder().addComponents(selectMenu);

                    await interaction.reply({
                        content: 'Select a new region for the voice channel:',
                        components: [regionRow],
                    });
                }
            });

            collector.on('end', async () => {
                // Clean up the message after the collector ends (e.g., remove buttons or send a final message)
                await textChannel.send('This dashboard has expired.');
            });
        }
    },
};