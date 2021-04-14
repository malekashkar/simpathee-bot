import { getModelForClass, prop } from "@typegoose/typegoose";
import { TBazaarItemIds } from "../utils/interfaces";

export class BazaarItem {
  @prop({ unique: true })
  itemId: TBazaarItemIds;

  @prop()
  sellVolume: number;

  @prop()
  buyVolume: number;

  @prop()
  sellPrice: number;

  @prop()
  buyPrice: number;

  @prop()
  createdAt: Date;
}

export const BazaarModel = getModelForClass(BazaarItem);
