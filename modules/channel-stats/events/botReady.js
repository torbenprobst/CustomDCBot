const {formatDate} = require('../../../src/functions/helpers');
const {localize} = require('../../../src/functions/localize');

module.exports.run = async (client) => {
    const channels = require(`${client.configDir}/channel-stats/channels.json`);
    for (const channel of channels) {
        const dcChannel = await client.channels.fetch(channel.channelID).catch(() => {
        });
        if (!dcChannel) continue;
        if (dcChannel.type !== 'GUILD_VOICE') client.logger.warn(`[channel-stats] ` + localize('channel-stats', 'not-voice-channel-info', {
            c: dcChannel.name,
            id: dcChannel.id,
            t: dcChannel.type
        }));
        const res = await channelNameReplacer(client, dcChannel, channel.channelName);
        if (res !== dcChannel.name) dcChannel.setName(res, '[channel-stats] ' + localize('channel-stats', 'audit-log-reason-startup'));
        client.intervals.push(setInterval(async () => {
            const repName = await channelNameReplacer(client, dcChannel, channel.channelName);
            if (repName !== dcChannel.name) dcChannel.setName(repName, '[channel-stats] ' + localize('channel-stats', 'audit-log-reason-interval'));
        }, (channel.updateInterval || 5) < 5 * 60000 ? 5 * 60000 : channel.updateInterval * 60000));
    }
};

/**
 * Replaces the variables in channel names
 * @private
 * @param {Client} client Client
 * @param {Channel} channel Channel
 * @param {String} input Input to be replaced
 * @return {Promise<string>}
 */
async function channelNameReplacer(client, channel, input) {
    const users = await channel.guild.members.fetch();
    const members = users.filter(u => !u.user.bot);
    return input.split('%userCount%').join(users.size)
        .split('%memberCount%').join(members.size)
        .split('%onlineUserCount%').join(users.filter(u => u.presence && (u.presence || {}).status !== 'offline').size)
        .split('%onlineMemberCount%').join(members.filter(u => u.presence && (u.presence || {}).status !== 'offline').size)
        .split('%channelCount%').join(channel.guild.channels.cache.size)
        .split('%roleCount%').join(channel.guild.roles.cache.size)
        .split('%botCount%').join(users.filter(m => m.user.bot).size)
        .split('%dndCount%').join(members.filter(u => u.presence && (u.presence || {}).status === 'dnd').size)
        .split('%awayCount%').join(members.filter(m => m.presence && (m.presence || {}).status === 'idle').size)
        .split('%offlineCount%').join(members.filter(m => !m.presence || (m.presence || {}).status === 'offline').size)
        .split('%guildBoosts%').join(channel.guild.premiumSubscriptionCount || '0')
        .split('%boostLevel%').join(channel.guild.premiumTier)
        .split('%boosterCount%').join(members.filter(m => !!m.premiumSinceTimestamp).size)
        .split('%emojiCount%').join(channel.guild.emojis.cache.size)
        .split('%currentTime%').join(formatDate(new Date(), true));
}