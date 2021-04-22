import { getModelForClass, prop } from "@typegoose/typegoose";

export class LeafUser {
  @prop()
  username: string;

  @prop({ type: String, default: [] })
  items: string[];
}

export class LeafMessage {
  @prop()
  authorId: string;

  @prop()
  messageId: string;

  @prop({ type: LeafUser, default: [] })
  users: LeafUser[];

  @prop()
  username?: string;
}

export const LeafMessageModel = getModelForClass(LeafMessage);
