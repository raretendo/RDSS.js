import RoleUtils from "../utils/RoleUtils";
import ModAlert from "../utils/ModAlert";
import Properties from "../utils/Properties";
import QuickMute from "../utils/QuickMute";
import BanRequest from "../utils/BanRequest";
import EventListener from "../modules/events/Event";
import Bot from "../Bot";

import {
    MessageReaction,
    TextChannel,
    GuildMember,
    Message,
    User
} from "discord.js";

module.exports = class MessageReactionAddEventListener extends EventListener {
    constructor(client: Bot) {
        super(client, {
            name: "messageReactionAdd",
            once: false
        });
    }

    async execute(reaction: MessageReaction, user: User) {
        if (!reaction.message.guild) return;

        let message!: Message;

        await reaction.message.fetch()
            .then(m => message = m)
            .catch(console.error);

        if (!message) return;

        // Mod alert handler
        if (reaction.emoji.id == Properties.emojis.alert) {
            if (message.channel.id == Properties.channels.alerts) return;
            if (ModAlert.existingModAlerts.has(message.id)) return;

            ModAlert.createModAlert(message, user);
        }

        const reactee = await message.guild?.members.fetch(user.id);
        if (!reactee) return;

        // Quick mute handler
        if (
            reaction.emoji.id == Properties.emojis.quickMute30 ||
            reaction.emoji.id == Properties.emojis.quickMute60
        ) {
            if (!RoleUtils.hasAnyRole(reactee, [
                RoleUtils.roles.moderator,
                RoleUtils.roles.seniorModerator,
                RoleUtils.roles.manager
            ])) return;

            const commandsChannel = await message.guild?.channels.fetch(Properties.channels.commands) as TextChannel;
            if (!commandsChannel) return;
            
            const { member, channel } = message;

            let duration = "30m";
            if (reaction.emoji.id == Properties.emojis.quickMute60) duration = "60m";

            await QuickMute.quickMuteUser(user, message.author.id, duration, message.content, commandsChannel, message);
            await QuickMute.purgeMessagesFromUserInChannel((channel as TextChannel), (member as GuildMember), user);

            const modAlertChannel = await message.guild?.channels.fetch(Properties.channels.alerts) as TextChannel;
            if (!modAlertChannel) return;

            ModAlert.deleteModAlert(message.id, null, modAlertChannel);
        }


        // Message purging handler
        if (reaction.emoji.id == Properties.emojis.sweep) {
            if (!RoleUtils.hasAnyRole(reactee, [
                RoleUtils.roles.moderator,
                RoleUtils.roles.seniorModerator,
                RoleUtils.roles.manager
            ])) return;

            if (!message.member) return;
            await QuickMute.purgeMessagesFromUserInChannel((message.channel as TextChannel), message.member, user)
        }


        // Approve ban request
        if (reaction.emoji.id == Properties.emojis.approve) {
            if (message.channel.id != Properties.channels.banRequestsQueue) return;

            if (!RoleUtils.hasAnyRole(reactee, [
                RoleUtils.roles.seniorModerator,
                RoleUtils.roles.manager
            ])) return;

            const commandsChannel = await message.guild?.channels.fetch(Properties.channels.commands) as TextChannel;
            if (!commandsChannel) return;

            BanRequest.approveBanRequest(message, commandsChannel, reactee)
        }


        // Reject ban request
        if (reaction.emoji.id == Properties.emojis.reject) {
            if (message.channel.id != Properties.channels.banRequestsQueue) return;

            if (!RoleUtils.hasAnyRole(reactee, [
                RoleUtils.roles.seniorModerator,
                RoleUtils.roles.manager
            ])) return;

            const commandsChannel = await message.guild?.channels.fetch(Properties.channels.commands) as TextChannel;
            if (!commandsChannel) return;

            BanRequest.rejectBanRequest(message, commandsChannel, reactee)
        }
    }
}
