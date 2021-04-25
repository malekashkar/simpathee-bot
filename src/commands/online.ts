import { Message } from "discord.js";
import Command from ".";
import embeds from "../utils/embeds";

export default class OnlineCommand extends Command {
  cmdName = "online";
  description = "Check what leafing bots are currently online.";

  async run(message: Message) {
    const playersActivity = (
      await Promise.all(
        this.client.bots.map(async (bot) => {
          console.log(bot);
          if (bot.mineflayerBot?.player?.uuid) {
            const playerActivity = await this.client.hypixel.getPlayerActivity(
              bot.mineflayerBot.player.uuid
            );
            if (playerActivity) {
              return {
                name: `${bot.mineflayerBot.username}`,
                value: `${
                  playerActivity.session.online
                    ? `🟢 Online (${
                        playerActivity.session.gameType
                      } ~ ${playerActivity.session.mode.toLowerCase()})`
                    : `🔴 Offline`
                }`,
                inline: true,
              };
            }
          }
        })
      )
    ).filter((x) => !!x);

    await message.channel.send(
      embeds.empty().setTitle(`Online Leafers`).addFields(playersActivity)
    );
  }
}
