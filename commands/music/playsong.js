const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const play = require('play-dl');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a YouTube video in your voice channel.')
        .addStringOption((option) =>
            option
                .setName('url')
                .setDescription('The YouTube video URL')
                .setRequired(true)
        ),
    async execute(interaction) {
        const url = interaction.options.getString('url');

        // Check if the user is in a voice channel
        const memberVoiceChannel = interaction.member.voice.channel;
        if (!memberVoiceChannel) {
            return interaction.reply({
                content: 'You need to be in a voice channel to use this command!',
                ephemeral: true,
            });
        }

        try {
            // Defer the reply to show loading status
            await interaction.deferReply();

            // Join the user's voice channel
            const connection = joinVoiceChannel({
                channelId: memberVoiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            // Create an audio player
            const player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play
                }
            })

            // Fetch the audio stream
            const stream = await play.stream(url);

            // Create an audio resource
            try {
                const resource = createAudioResource(fs.createReadStream('./believer.mp3'))
                player.play(resource);
                connection.subscribe(player);

                await interaction.editReply(`🎵 Now playing: ${url}`);
            } catch (error) {
                console.error('Error creating audio resource:', error);
                await interaction.editReply({
                    content: 'An error occurred while processing the audio. Please try again.',
                });
                if (connection.state.status !== 'destroyed') {
                    connection.destroy();
                }
                return;
            }

            // Handle player events
            player.on(AudioPlayerStatus.Idle, () => {
                if (connection.state.status !== 'destroyed') {
                    connection.destroy();
                }
            });

            player.on('error', (error) => {
                console.error('Player error:', error);
                if (connection.state.status !== 'destroyed') {
                    connection.destroy();
                }
            });
        } catch (error) {
            console.error('Error:', error);
            interaction.reply({
                content: 'Failed to play the YouTube video. Please check the URL and try again.',
                ephemeral: true,
            });
        }
    },
};
