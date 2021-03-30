import { DMChannel, Message, TextChannel } from "discord.js";
import embeds from "./embeds";
import config from "../config";
import fetch from "node-fetch";

export async function imageQuestion(question: string, message: Message) {
  const questionMessage = await message.channel.send(
    `${message.author}`,
    embeds.question(question)
  );
  const collected = await message.channel.awaitMessages(
    (m: Message) => m.author.id === message.author.id,
    { time: config.questionTime, max: 1, errors: ["time"] }
  );
  if (collected.size) {
    let imageLink: string;
    if (collected.first().attachments.size) {
      const link = collected.first().attachments.first().url;
      const imageAPIRequest = await fetch(`http://localhost:5000/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: link,
        }),
      });
      if (imageAPIRequest.status !== 200) return false;

      const response = await imageAPIRequest.json();
      imageLink = `http://localhost:5000/images/${response.imageId}`;
    } else {
      const link = collected.first().content;
      const imageAPIRequest = await fetch(`http://localhost:5000/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: link,
        }),
      });
      if (imageAPIRequest.status !== 200) return false;

      const response = await imageAPIRequest.json();
      imageLink = `http://localhost:5000/images/${response.imageId}`;
    }
    if (questionMessage.deletable) questionMessage.delete();
    if (collected.first()?.deletable) collected.first().delete();
    return imageLink;
  } else {
    return false;
  }
}

export async function question(
  question: string,
  message: Message,
  channel?: TextChannel | DMChannel
) {
  if (!channel) channel === message.channel;
  try {
    const questionMessage = await message.channel.send(
      `${message.author}`,
      embeds.question(question)
    );
    const collected = await message.channel.awaitMessages(
      (m: Message) => m.author.id === message.author.id,
      { time: config.questionTime, max: 1, errors: ["time"] }
    );
    if (collected.size) {
      if (questionMessage.deletable) questionMessage.delete();
      if (collected.first()?.deletable) collected.first().delete();
      return collected.first();
    } else {
      return false;
    }
  } catch (err) {
    if (message.channel instanceof DMChannel) {
      message.channel.send(
        embeds.error(
          `Your dm's are currently closed, please make sure they are open to proceed!`
        )
      );
    } else {
      console.log(err);
    }
  }
}

export async function questionOption(
  optionQuestion: string,
  question: string,
  message: Message
) {
  const reactionQuestionMessage = await message.channel.send(
    `${message.author}`,
    embeds.question(optionQuestion)
  );

  reactionQuestionMessage.react("✅");
  reactionQuestionMessage.react("❌");

  const rCollected = await reactionQuestionMessage.awaitReactions(
    (r, u) => u.id === message.author.id && ["✅", "❌"].includes(r.emoji.name),
    { max: 1, time: config.questionTime, errors: ["time"] }
  );

  if (rCollected.first()?.emoji?.name === "✅") {
    if (reactionQuestionMessage.deletable) reactionQuestionMessage.delete();

    const questionMessage = await message.channel.send(
      `${message.author}`,
      embeds.question(question)
    );

    const collected = await message.channel.awaitMessages(
      (m: Message) => m.author.id === message.author.id,
      { time: config.questionTime, max: 1, errors: ["time"] }
    );

    if (collected.size) {
      if (collected.first()?.deletable) collected.first().delete();
      if (questionMessage.deletable) questionMessage.delete();
      return collected.first();
    } else {
      return false;
    }
  } else {
    if (reactionQuestionMessage.deletable) reactionQuestionMessage.delete();
    return false;
  }
}
