import { Message, TextChannel } from "discord.js";
import Command from ".";
import config from "../config";
import { AccountModel } from "../models/account";
import embeds from "../utils/embeds";
import { ArchivedModel } from "../models/archived";
import _ from "lodash";

export default class LeafCommand extends Command {
  cmdName = "leaf";
  description = "To be honest we're just trying to have some fun leafing kids.";

  async run(message: Message) {
    if (message.channel.id === config.leafChannelId) {
      const accounts = await AccountModel.find().limit(3);
      if (accounts?.length) {
        const accountsLeft = await AccountModel.countDocuments();
        await message.channel.send(
          message.author.toString(),
          embeds
            .empty()
            .setTitle(`${message.author.username}'s Leaf List`)
            .addFields(
              accounts.map((account) => {
                return {
                  name: account.username,
                  value: account.items.join("\n"),
                  inline: false,
                };
              })
            )
            .setFooter(`${accountsLeft} Players Left`)
        );

        await AccountModel.deleteMany({
          _id: { $in: accounts.map((x) => x._id) },
        });

        /*
        const shortFormattedAccounts = accounts
          .map((account) => account.username)
          .join(", ");
        const leafLogChannel = message.guild.channels.resolve(
          config.leafLogChannelId
        ) as TextChannel;
        if (leafLogChannel) {
          leafLogChannel.send(
            embeds
              .normal(
                `Leaf Logs`,
                `${message.author} pulled the accounts **${shortFormattedAccounts}**.`
              )
              .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
              .setFooter(`${accountsLeft} Players Left`)
          );
        }
        */
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
