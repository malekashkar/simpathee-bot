import { Message, TextChannel } from "discord.js";
import Command from ".";
import config from "../config";
import { StarsModel } from "../models/stars";
import embeds from "../utils/embeds";

export default class LeafCommand extends Command {
  cmdName = "leaf";
  description = "To be honest we're just trying to have some fun leafing kids.";

  async run(message: Message) {
    if (message.channel.id === config.leafChannelId) {
      const account = await StarsModel.findOne({
        seen: false,
      });
      if (account) {
        const leafLogChannel = message.guild.channels.resolve(
          config.leafLogChannelId
        ) as TextChannel;
        await message.channel.send(
          embeds.empty().setTitle(`${account.username} | ${account.itemName}`)
        );
        await leafLogChannel.send(
          embeds
            .normal(
              `Leaf Logs`,
              `${message.author} pulled the username **${account.username}** to leaf.`
            )
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        );

        await StarsModel.updateOne(account._id, {
          seen: true,
        });
      } else {
        message.channel.send(
          embeds.error(`There are no accounts in the database currently.`)
        );
      }
    }
  }
}
