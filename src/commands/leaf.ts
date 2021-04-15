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
        const formattedAccounts = accounts
          .map(
            (account, i) =>
              `${i + 1} **${account.username}** | __${account.items.join(
                ", "
              )}__`
          )
          .join("\n");
        await message.channel.send(
          message.author.toString(),
          embeds.normal(
            `${message.author.username}'s Leaf List`,
            formattedAccounts
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
        await AccountModel.deleteMany({
          _id: { $in: accounts.map((x) => x._id) },
        });
        for (const account of accounts) {
          const archivedDocument = await ArchivedModel.findOne({
            username: account.username,
          });
          if (archivedDocument) {
            archivedDocument.items = _.uniq(
              account.items.concat(archivedDocument.items)
            );
            await archivedDocument.save();
          } else {
            await ArchivedModel.create({
              username: account.username,
              items: account.items,
            });
          }
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
