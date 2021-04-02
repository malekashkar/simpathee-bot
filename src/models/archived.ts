import { getModelForClass, prop } from "@typegoose/typegoose";

export class Archived {
  @prop()
  username: string;

  @prop()
  itemName: string;

  @prop()
  createdAt: Date;
}

export const ArchivedModel = getModelForClass(Archived);
