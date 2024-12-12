const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fuelprice')
        .setDescription('Fetches the latest fuel prices.'),
    async execute(interaction) {
        await interaction.deferReply(); // Allow time for processing

        const url = 'https://webtygia.com/api/xang-dau';

        try {
            const { data: html } = await axios.get(url);
            const $ = cheerio.load(html);

            const rows = $('table tbody tr');
            let vung1Data = '';
            let vung2Data = '';

            rows.each((index, row) => {
                const cells = $(row).find('td');
                if (cells.length === 3) {
                    const sanPham = $(cells[0]).text().trim();
                    const vung1 = $(cells[1]).text().trim();
                    const vung2 = $(cells[2]).text().trim();
                    vung1Data += `⛽ **${sanPham}:** ${vung1} VNĐ/Lít\n`;
                    vung2Data += `⛽ **${sanPham}:** ${vung2} VNĐ/Lít\n`;
                }
            });

            if (!vung1Data || !vung2Data) {
                await interaction.followUp('Không tìm thấy dữ liệu giá xăng dầu.');
                return;
            }

            // Create a select menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select-fuel-price')
                .setPlaceholder('Chọn vùng để xem giá xăng dầu')
                .addOptions([
                    {
                        label: 'Vùng 1',
                        description: 'Hiển thị giá xăng dầu Vùng 1',
                        value: 'vung1',
                    },
                    {
                        label: 'Vùng 2',
                        description: 'Hiển thị giá xăng dầu Vùng 2',
                        value: 'vung2',
                    },
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Send the initial response with the dropdown
            const initialMessage = await interaction.followUp({
                content: 'Vui lòng chọn vùng để xem giá xăng dầu:',
                components: [row],
            });

            // Handle user selection
            const collector = interaction.channel.createMessageComponentCollector({
                filter: (i) => i.customId === 'select-fuel-price' && i.user.id === interaction.user.id,
                time: 60000,
            });

            collector.on('collect', async (selectInteraction) => {
                let embed;

                if (selectInteraction.values[0] === 'vung1') {
                    embed = new EmbedBuilder()
                        .setColor(0x7289da)
                        .setTitle('📢 Cập nhật giá xăng dầu - Vùng 1')
                        .setDescription(vung1Data)
                        .setFooter({ text: 'Cập nhật tự động' })
                        .setTimestamp();
                } else if (selectInteraction.values[0] === 'vung2') {
                    embed = new EmbedBuilder()
                        .setColor(0x7289da)
                        .setTitle('📢 Cập nhật giá xăng dầu - Vùng 2')
                        .setDescription(vung2Data)
                        .setFooter({ text: 'Cập nhật tự động' })
                        .setTimestamp();
                }

                // Edit the initial message to replace it with the embed
                await initialMessage.edit({ content: null, embeds: [embed], components: [] });
                await selectInteraction.deferUpdate();
            });

            collector.on('end', async () => {
                try {
                    await initialMessage.edit({ components: [] }); // Remove the dropdown after timeout
                } catch (error) {
                    console.error('Failed to remove components:', error);
                }
            });
        } catch (error) {
            console.error(error);
            await interaction.followUp('Đã xảy ra lỗi khi lấy thông tin.');
        }
    },
};
