import { getModelForClass, prop } from "@typegoose/typegoose";
import { MessageEmbed } from "discord.js";

export class BaseMessage {
  @prop()
  content: string;

  @prop()
  embed: MessageEmbed;
}

export class LeafMessage {
  @prop()
  authorId: string;
  
  @prop()
  messageId: string;

  @prop({ type: String, default: [] })
  usernames: string[];

  @prop({ type: BaseMessage, default: {} })
  baseMessage: BaseMessage;

  @prop()
  username?: string;
}

export const LeafMessageModel = getModelForClass(LeafMessage);
