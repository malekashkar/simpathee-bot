import { stripIndents } from "common-tags";
import { MessageReaction, TextChannel, User } from "discord.js";
import Event, { EventNameType } from ".";
import config from "../config";
import { BlacklistedModel } from "../models/blacklisted";
import { LeafMessageModel } from "../models/leafMessage";
import embeds from "../utils/embeds";

export default class LeafReactions extends Event {
  eventName: EventNameType = "messageReactionAdd";

  async handle(reaction: MessageReaction, user: User) {
    if (user.bot) return;
    if (reaction.message.partial) await reaction.message.fetch();

    const message = reaction.message;
    const leafMessageDoc = await LeafMessageModel.findOne({
      messageId: message.id,
    });
    if (leafMessageDoc) {
      if (
        [config.emojis.one, config.emojis.two, config.emojis.three].includes(
          reaction.emoji.name
        )
      ) {
        if (leafMessageDoc?.usernames?.length) {
          const username =
            reaction.emoji.name === config.emojis.one
              ? leafMessageDoc.usernames[0]
              : reaction.emoji.name === config.emojis.two
              ? leafMessageDoc.usernames[1]
              : reaction.emoji.name === config.emojis.three
              ? leafMessageDoc.usernames[2]
              : null;
          if (username) {
            await message.reactions.removeAll();
            await message.react(config.emojis.leafHit);
            await message.react(config.emojis.leafFail);
            await message.edit(
              embeds.normal(
                `Leaf Question`,
                stripIndents`Click ${config.emojis.leafHit} if you successfully hit \`${username}\`.
                    Click ${config.emojis.leafFail} if you failed hitting \`${username}\`.`
              )
            );
            leafMessageDoc.username = username;
            await leafMessageDoc.save();
          }
        }
      }

      if (
        [config.emojis.leafHit, config.emojis.leafFail].includes(
          reaction.emoji.name
        ) &&
        leafMessageDoc.username
      ) {
        const blacklistedUser = await BlacklistedModel.findOne({
          username: leafMessageDoc.username,
        });
        if (!blacklistedUser) {
          await BlacklistedModel.create({
            username: leafMessageDoc.username,
          });
        }

        await message.edit(
          leafMessageDoc.baseMessage.content,
          leafMessageDoc.baseMessage.embed
        );
        await message.reactions.removeAll();
        await message.react(config.emojis.one);
        await message.react(config.emojis.two);
        await message.react(config.emojis.three);

        const cutsChannel = message.guild.channels.resolve(
          config.channels.leafCuts
        ) as TextChannel;
        await cutsChannel.send(
          embeds.normal(
            `Leaf Success`,
            `${user} successfully hit the player \`${leafMessageDoc.username}\``
          )
        );
      }
    }
  }
}
