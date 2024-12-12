const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('goldprice')
        .setDescription('Fetches the latest gold prices by type.'),
    async execute(interaction) {
        await interaction.deferReply(); // Allow time for processing

        const goldTypes = [
            { label: 'Vàng SJC', value: 'SJC' },
            { label: 'Vàng Doji', value: 'DOJI' },
            { label: 'Vàng Ngân hàng', value: '3BANKS' },
            { label: 'Vàng PNJ', value: 'PNJ' },
            { label: 'Vàng Ngọc Hải', value: 'NgocHai' },
            { label: 'Vàng Mi Hồng', value: 'MiHong' },
            { label: 'Vàng Bảo Tín Minh Châu - BTMC', value: 'BTMC' },
            { label: 'Vàng Phú Quý', value: 'PhuQuy' },
            { label: 'Vàng Ngọc Thẩm', value: 'NgocTham' },
            { label: 'Vàng Sinh Diễn', value: 'SinhDien' },
            { label: 'Vàng Mão Thiệt', value: 'MaoThiet' },
        ];

        // Build the select menu
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select-gold-type')
                .setPlaceholder('Chọn loại vàng')
                .addOptions(
                    goldTypes.map((type) => ({
                        label: type.label,
                        value: type.value,
                    }))
                )
        );

        // Prompt the user to select a gold type
        const initialMessage = await interaction.followUp({
            content: 'Vui lòng chọn loại vàng để xem giá:',
            components: [row],
        });

        // Create a collector to handle the user's selection
        const collector = interaction.channel.createMessageComponentCollector({
            filter: (i) => i.customId === 'select-gold-type' && i.user.id === interaction.user.id,
            time: 60000,
        });

        collector.on('collect', async (menuInteraction) => {
            const selectedType = menuInteraction.values[0];

            try {
                const apiUrl = 'https://webtygia.com/api/get-gold';
                const payload = { company: selectedType };
                const { data } = await axios.post(apiUrl, payload);

                if (data.html != null) {
                    const wrappedHtml = `<table>${data.html.trim()}</table>`;
                    const $ = cheerio.load(wrappedHtml);

                    let embedDescription = '';

                    $('tr').each((_, element) => {
                        const location = $(element).find('th a').text().trim();
                        const product = $(element).find('th:nth-child(2)').text().trim();
                        const buyPrice = $(element).find('td:nth-child(3) div').first().text().trim();
                        const sellPrice = $(element).find('td:nth-child(4) div').first().text().trim();

                        if (location && product && buyPrice && sellPrice) {
                            embedDescription += `📍 **${location}**\n💰 **${product}**\n🔼 **Mua:** ${buyPrice} VNĐ\n🔽 **Bán:** ${sellPrice} VNĐ\n\n`;
                        }
                    });

                    if (!embedDescription) {
                        embedDescription = 'Không tìm thấy dữ liệu giá vàng.';
                    }

                    const embed = new EmbedBuilder()
                        .setColor(0x7289da)
                        .setTitle(`📢 Giá vàng: ${goldTypes.find((t) => t.value === selectedType).label}`)
                        .setDescription(embedDescription)
                        .setFooter({ text: 'Cập nhật tự động' })
                        .setTimestamp();

                    // Edit the initial message to replace it with the embed
                    await initialMessage.edit({ content: null, embeds: [embed], components: [] });
                    await menuInteraction.deferUpdate();
                } else {
                    throw new Error('Invalid API response');
                }
            } catch (error) {
                console.error(error);
                await menuInteraction.deferUpdate();
                await initialMessage.edit({
                    content: 'Đã xảy ra lỗi khi lấy thông tin giá vàng.',
                    components: [],
                });
            }
        });

        collector.on('end', async () => {
            try {
                await initialMessage.edit({ components: [] }); // Remove the dropdown after timeout
            } catch (error) {
                console.error('Failed to remove components:', error);
            }
        });
    },
};
