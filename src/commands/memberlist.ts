import { Message } from "discord.js";
import Command from ".";
import config from "../config";
import embeds from "../utils/embeds";
import { getGuild, getPlayerActivity, uuidToUsername } from "../utils/hypixel";
import Paginator from "../utils/pagecord";

interface MemberInformation {
  savedAt: number;
  uuid: string;
  username: string;
  online: boolean;
  gameType: string;
}

export default class MemberlistCommand extends Command {
  cmdName = "memberlist";
  description = "Check the activity of the members in the guild.";

  async run(message: Message) {
    const guildInformation = await getGuild(config.ingameGuildId);
    if (!guildInformation)
      return message.channel.send(
        embeds.error(`There was an error fetching the guild information.`)
      );

    const loadingEmbed = await message.channel.send(embeds.loading());
    const memberInformationEmbed = embeds
      .empty()
      .setTitle(`${guildInformation.name} Members`);

    const membersInformation: MemberInformation[] = [];
    for (const member of guildInformation.members) {
      const cacheMember = await this.client.redis.get(`gm-${member.uuid}`);
      if (cacheMember) {
        const cachedMemberJSON = JSON.parse(cacheMember) as MemberInformation;
        if (
          cachedMemberJSON.savedAt + config.redisCooldowns.guildMemberStatus >
          Date.now()
        ) {
          membersInformation.push(cachedMemberJSON);
          continue;
        } else {
          await this.client.redis.del(`gm-${member.uuid}`);
        }
      }

      const playerUsername = await uuidToUsername(member.uuid);
      const playerActivity = await getPlayerActivity(member.uuid);

      if (playerUsername && playerActivity) {
        const playerData: MemberInformation = {
          savedAt: Date.now(),
          uuid: member.uuid,
          username: playerUsername,
          online: playerActivity.session.online,
          gameType: playerActivity.session.gameType,
        };

        membersInformation.push(playerData);

        await this.client.redis.set(
          `gm-${member.uuid}`,
          JSON.stringify(playerData)
        );
      }
    }

    const paginator = new Paginator(
      message,
      Math.ceil(membersInformation.length / 12),
      async (pageIndex) => {
        const members = membersInformation
          .sort((a, b) => {
            if (a.online) {
              return -1;
            } else {
              return 1;
            }
          })
          .slice(pageIndex * 12, (pageIndex + 1) * 12);

        const fields = members.map((member) => {
          return {
            name: `${member.username}`,
            value: `${
              member.online
                ? `🟢 Online (${member.gameType.toLowerCase()})`
                : `🔴 Offline`
            }`,
            inline: true,
          };
        });

        return embeds
          .empty()
          .setTitle(`${guildInformation.name} Members`)
          .addFields(fields);
      }
    );

    await loadingEmbed.delete();
    await paginator.start();
  }
}
