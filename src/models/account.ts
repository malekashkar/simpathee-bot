import { getModelForClass, prop } from "@typegoose/typegoose";

export class Account {
  @prop({ unique: true })
  username: string;

  @prop({ type: String, default: [] })
  items: string[];

  @prop()
  createdAt: Date;
}

export const AccountModel = getModelForClass(Account);
