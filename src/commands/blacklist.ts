import { Message } from "discord.js";
import Command from ".";
import { BlacklistedModel } from "../models/blacklisted";
import embeds from "../utils/embeds";

export default class BlacklistCommand extends Command {
  cmdName = "blacklist";
  description = "Manually blacklist users that you leafed";
  aliases = ["bl"];

  async run(message: Message, args: string[]) {
    const username = args[0];
    if (!username)
      return message.channel.send(
        embeds.error(`Please provide the username you would like to blacklist!`)
      );

    await BlacklistedModel.create({
      username,
    });

    return message.channel.send(
      embeds.normal(
        `Player Added to Blacklisted`,
        `The username \`${username}\` has been added to the leaf members blacklist.`
      )
    );
  }
}
