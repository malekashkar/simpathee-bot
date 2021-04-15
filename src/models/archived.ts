import { getModelForClass, prop } from "@typegoose/typegoose";

export class Archived {
  @prop({ unique: true })
  username: string;

  @prop({ type: String, default: [] })
  items: string[];
}

export const ArchivedModel = getModelForClass(Archived);
