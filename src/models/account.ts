import { getModelForClass, prop } from "@typegoose/typegoose";

export class Account {
  @prop()
  username: string;

  @prop()
  itemName: string;

  @prop()
  createdAt: Date;
}

export const AccountModel = getModelForClass(Account);
