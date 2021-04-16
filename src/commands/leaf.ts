import { Message } from "discord.js";
import Command from ".";
import config from "../config";
import { AccountModel } from "../models/account";
import embeds from "../utils/embeds";
import _ from "lodash";
import { LeafMessageModel } from "../models/leafMessage";

export default class LeafCommand extends Command {
  cmdName = "leaf";
  description = "To be honest we're just trying to have some fun leafing kids.";

  async run(message: Message) {
    if (message.channel.id === config.channels.leafCommands) {
      const accounts = await AccountModel.find().limit(
        config.leafAccountsAmount
      );
      if (accounts?.length) {
        const accountsLeft = await AccountModel.countDocuments();
        const leafMessage = await message.channel.send(
          message.author.toString(),
          embeds
            .empty()
            .setTitle(`${message.author.username}'s Leaf List`)
            .addFields(
              accounts.map((account, i) => {
                return {
                  name: `${i + 1}. ${account.username}`,
                  value: account.items.join("\n"),
                  inline: false,
                };
              })
            )
            .setFooter(`${accountsLeft} Players Left`)
        );

        await leafMessage.react(config.emojis.one);
        await leafMessage.react(config.emojis.two);
        await leafMessage.react(config.emojis.three);

        await LeafMessageModel.create({
          authorId: message.author.id,
          messageId: leafMessage.id,
          usernames: accounts.map((account) => account.username),
          baseMessage: {
            content: leafMessage.content,
            embed: leafMessage.embeds[0],
          },
        });

        await AccountModel.deleteMany({
          _id: { $in: accounts.map((x) => x._id) },
        });
      } else {
        message.channel.send(
          embeds.error(
            `There were no accounts found in the database, please be patient for more accounts to load in.`
          )
        );
      }
    }
  }
}
