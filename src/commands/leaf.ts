import { Message } from "discord.js";
import Command from ".";
import config from "../config";
import { Account, AccountModel } from "../models/account";
import embeds from "../utils/embeds";
import _ from "lodash";
import { LeafMessageModel } from "../models/leafMessage";
import moment from "moment";
import { DocumentType } from "@typegoose/typegoose";

export default class LeafCommand extends Command {
  cmdName = "leaf";
  description = "To be honest we're just trying to have some fun leafing kids.";

  async run(message: Message, args: string[]) {
    if (message.channel.id === config.channels.leafCommands) {
      const filterItemName = args.length ? args.join(" ") : null;

      let accounts: DocumentType<Account>[] = [];
      if (filterItemName) {
        accounts = await AccountModel.aggregate([
          {
            $match: {
              items: {
                $in: ["$items", new RegExp(filterItemName, "i")],
              },
              createdAt: { $gte: new Date(Date.now() - 30 * 60e3) },
            },
          },
          { $sort: { createdAt: -1 } },
        ]).limit(config.leafAccountsAmount);
        console.log(JSON.stringify(accounts));
      } else {
        accounts = await AccountModel.aggregate([
          {
            $match: { createdAt: { $gte: new Date(Date.now() - 30 * 60e3) } },
          },
          { $sort: { createdAt: -1 } },
        ]).limit(config.leafAccountsAmount);
      }
      if (accounts?.length) {
        await AccountModel.deleteMany({
          _id: { $in: accounts.map((x) => x._id) },
        });

        const accountsLeft = await AccountModel.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 60e3) },
        });
        const leafMessage = await message.channel.send(
          message.author.toString(),
          embeds
            .empty()
            .setTitle(`${message.author.username}'s Leaf List`)
            .addFields(
              accounts.map((account, i) => {
                return {
                  name: `${i + 1}. ${account.username} (${moment(
                    account.createdAt
                  ).fromNow()})`,
                  value: account.items.join("\n"),
                  inline: false,
                };
              })
            )
            .setFooter(`${accountsLeft} Players Left`)
        );

        for (let i = 0; i < accounts.length; i++) {
          await leafMessage.react(config.emojis.numbers[i]);
        }

        await LeafMessageModel.create({
          authorId: message.author.id,
          messageId: leafMessage.id,
          users: accounts,
        });
      } else {
        if (filterItemName) {
          message.channel.send(
            embeds.error(
              `There were no accounts found in the database with the filter \`${filterItemName}\`, please be patient for more accounts to load in.`
            )
          );
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
}
