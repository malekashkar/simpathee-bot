import { getModelForClass, prop } from "@typegoose/typegoose";

export class Timestamp {
  @prop()
  category: string;

  @prop()
  lastTime: number;
}

export const TimestampModel = getModelForClass(Timestamp);
