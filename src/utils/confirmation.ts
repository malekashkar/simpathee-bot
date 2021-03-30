import { Message } from "discord.js";
import embeds from "./embeds";
import config from "../config";

export default async function confirmation(text: string, message: Message) {
  const msg = await message.channel.send(
    embeds.normal(
      `Confirm Action`,
      `${text}\nYou have 30 seconds to respond with ✅ or ❌.`
    )
  );

  msg.react("✅");
  msg.react("❌");

  const rCollected = await msg.awaitReactions(
    (reaction, user) =>
      user.id === message.author.id &&
      [`✅`, `❌`].includes(reaction.emoji.name),
    { max: 1, time: config.questionTime }
  );

  if (rCollected.size) {
    await msg.reactions.removeAll();
    if (rCollected.first().emoji.name === "❌") {
      return false;
    }
    return true;
  } else {
    await msg.reactions.removeAll();
    return false;
  }
}
