import { getModelForClass, prop } from "@typegoose/typegoose";

export class AuctionItem {
  @prop({ unique: true })
  itemName: string;

  @prop()
  itemId: string;

  @prop()
  minimumItemPrice: number;

  @prop()
  maximumItemPrice: number;

  @prop()
  createdAt: Date;
}

export const AuctionModel = getModelForClass(AuctionItem);
