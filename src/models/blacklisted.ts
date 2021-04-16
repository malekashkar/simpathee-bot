import { getModelForClass, prop } from "@typegoose/typegoose";

export class Blacklisted {
  @prop({ unique: true })
  username: string;
}

export const BlacklistedModel = getModelForClass(Blacklisted);
