import { Message } from "discord.js";
import Command from ".";
import embeds from "../utils/embeds";

export default class OnlineCommand extends Command {
  cmdName = "online";
  description = "Check what leafing bots are currently online.";

  async run(message: Message) {
    const formattedList = this.client.bots.map((x) => `\`${x.bot.username}\``);
    await message.channel.send(
      embeds.normal(
        `Online Leafers`,
        formattedList.length
          ? formattedList.join(", ")
          : `\`No accounts are currently online.\``
      )
    );
  }
}