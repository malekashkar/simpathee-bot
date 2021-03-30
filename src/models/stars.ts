import { getModelForClass, prop } from "@typegoose/typegoose";

export class Stars {
  @prop()
  username: string;

  @prop()
  itemName: string;

  @prop()
  createdAt: Date;

  @prop({ default: false })
  seen?: boolean;
}

export const StarsModel = getModelForClass(Stars);
