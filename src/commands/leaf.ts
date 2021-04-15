import { Message, TextChannel } from "discord.js";
import Command from ".";
import config from "../config";
import { AccountModel } from "../models/account";
import embeds from "../utils/embeds";
import moment from "moment";
import { ArchivedModel } from "../models/archived";

export default class LeafCommand extends Command {
  cmdName = "leaf";
  description = "To be honest we're just trying to have some fun leafing kids.";

  async run(message: Message) {
    if (message.channel.id === config.leafChannelId) {
      const accounts = await AccountModel.find().limit(3);
      if (accounts?.length) {
        await message.channel.send(
          message.author.toString(),
          embeds.normal(
            `${message.author.username}'s Leaf List`,
            accounts
              .map(
                (account, i) =>
                  `${i + 1} **${account.username}** | __${
                    account.itemName
                  }__ (${moment(account.createdAt).format("lll")})`
              )
              .join("\n")
          )
        );

        const accountsLeft = await AccountModel.countDocuments();
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
              .setFooter(`${accountsLeft} Usernames Left`)
          );
        }

        // Move the accounts into archived
        for (const account of accounts) {
          await account.deleteOne();
          await ArchivedModel.create({
            username: account.username,
            itemName: account.itemName,
          });
        }
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
