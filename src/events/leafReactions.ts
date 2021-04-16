import { stripIndents } from "common-tags";
import { MessageReaction, TextChannel, User } from "discord.js";
import Event, { EventNameType } from ".";
import config from "../config";
import { AccountModel } from "../models/account";
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
      if (config.emojis.numbers.includes(reaction.emoji.name)) {
        if (leafMessageDoc?.users?.length) {
          const username =
            leafMessageDoc.users[
              config.emojis.numbers.indexOf(reaction.emoji.name)
            ]?.username;
          if (username) {
            await message.edit(
              embeds.normal(
                `Leaf Question`,
                stripIndents`Click ${config.emojis.leafHit} if you successfully hit \`${username}\`.
                    Click ${config.emojis.leafFail} if you failed hitting \`${username}\`.`
              )
            );
            await message.reactions.removeAll();
            await message.react(config.emojis.leafHit);
            await message.react(config.emojis.leafFail);

            leafMessageDoc.users = leafMessageDoc.users.filter(
              (leafUser) => leafUser.username !== username
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

        if (reaction.emoji.name === config.emojis.leafHit) {
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

        if (leafMessageDoc.users.length) {
          const accountsLeft = await AccountModel.countDocuments();
          const baseEmbed = embeds
            .empty()
            .setTitle(`${user.username}'s Leaf List`)
            .addFields(
              leafMessageDoc.users.map((account, i) => {
                return {
                  name: `${i + 1}. ${account.username}`,
                  value: account.items.join("\n"),
                  inline: false,
                };
              })
            )
            .setFooter(`${accountsLeft} Players Left`);
          await message.edit(baseEmbed);
          await message.reactions.removeAll();
          for (let i = 0; i < leafMessageDoc.users.length; i++) {
            await message.react(config.emojis.numbers[i]);
          }

          leafMessageDoc.username = null;
          await leafMessageDoc.save();
        } else {
          await message.delete();
          await leafMessageDoc.deleteOne();
        }
      }
    }
  }
}
