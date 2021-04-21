import { Message } from "discord.js";
import Command from ".";
import embeds from "../utils/embeds";

export default class ChatCommand extends Command {
  cmdName = "chat";
  description = "Make the bots on the server say something in chat";

  async run(message: Message, args: string[]) {
    const botNames = this.client.bots.map((bot) => bot.mineflayerBot.username).join(", ");
    if (args.length < 2)
      return message.channel.send(
        embeds.error(
          `Please provide the name of the bot and the chat message.\n\`${botNames}\``
        )
      );

    const scraper = this.client.bots.find(
      (x) =>
        x.mineflayerBot.username?.toLowerCase() === args.shift().toLowerCase() && x.mineflayerBot
    );
    if (scraper) {
      scraper.mineflayerBot.chat(args.join(" "));
      return message.channel.send(
        embeds.normal(
          `Chat Message Sent`,
          `The message \`${args.join(" ")}\` has been sent!`
        )
      );
    } else {
      return message.channel.send(embeds.error(`Bot Names: \`${botNames}\``));
    }
  }
}
