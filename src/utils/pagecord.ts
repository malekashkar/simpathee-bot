import {
  DMChannel,
  Message,
  MessageEmbed,
  NewsChannel,
  TextChannel,
} from "discord.js";
import { EventEmitter } from "events";

const availableEmojis = {
  prev: "◀️",
  next: "▶️",
};

const availableEmojiStrings = Object.values(availableEmojis);

export declare interface Paginator {
  on(event: "start", listener: () => void): this;
  on(event: "prev", listener: () => void): this;
  on(event: "next", listener: () => void): this;

  emit(event: "start"): boolean;
  emit(event: "prev"): boolean;
  emit(event: "next"): boolean;
}

export class Paginator extends EventEmitter {
  public sentMessage: Message;
  public currentPageIndex: number = 0;

  constructor(
    public message: Message,
    public pageCount: number,
    private pageExtractor: (pageIndex: number) => Promise<MessageEmbed>,
    initialPageIndex = 0
  ) {
    super();
    this.currentPageIndex = initialPageIndex;
  }

  async getDecoratedEmbed(pageIndex: number) {
    const embed = await this.pageExtractor(pageIndex);
    const embedPage: MessageEmbed =
      embed instanceof MessageEmbed ? embed : new MessageEmbed(embed);
    return embedPage.setFooter(`Page ${pageIndex + 1} of ${this.pageCount}`);
  }

  async start(
    channel: TextChannel | DMChannel | NewsChannel = this.message.channel
  ) {
    this.sentMessage = (await channel.send(
      await this.getDecoratedEmbed(this.currentPageIndex)
    )) as Message;

    if (this.pageCount > 1) {
      Promise.all([
        availableEmojiStrings.map((x) => this.sentMessage.react(x)),
      ]);
      const reactionCollector = this.sentMessage.createReactionCollector(
        (reaction, user) => {
          return (
            user.id === this.message.author.id &&
            availableEmojiStrings.includes(reaction.emoji.name) &&
            !(reaction.me && reaction.users.cache.size === 1)
          );
        },
        { time: 60000, max: this.pageCount * 5 }
      );
      this.emit("start");
      reactionCollector.on("end", () => {
        if (
          this.sentMessage.guild &&
          this.sentMessage.guild.me &&
          this.sentMessage.guild.me.hasPermission("MANAGE_MESSAGES")
        ) {
          this.sentMessage.reactions.removeAll();
        }
      });
      reactionCollector.on("collect", async (reaction) => {
        reactionCollector.resetTimer({ time: 60000 });
        if (
          this.sentMessage.guild &&
          this.sentMessage.guild.me.hasPermission("MANAGE_MESSAGES")
        ) {
          (await reaction.users.fetch()).forEach((user) => {
            if (user.id !== this.message.client.user.id)
              reaction.users.remove(user);
          });
        }
        if (reaction.emoji.name === availableEmojis.prev) {
          this.currentPageIndex--;
          if (this.currentPageIndex < 0)
            this.currentPageIndex = this.pageCount - 1;
          this.sentMessage.edit(
            await this.getDecoratedEmbed(this.currentPageIndex)
          );
          this.emit("prev");
        } else if (reaction.emoji.name === availableEmojis.next) {
          this.currentPageIndex++;
          if (this.currentPageIndex >= this.pageCount) {
            this.currentPageIndex = 0;
          }
          this.sentMessage.edit(
            await this.getDecoratedEmbed(this.currentPageIndex)
          );
          this.emit("next");
        }
      });
    }
    return this.sentMessage;
  }
}

export default Paginator;
