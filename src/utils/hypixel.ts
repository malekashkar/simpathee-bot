import { IAuctionItem, IItem, NBTData } from "./interfaces";
import { parse, simplify } from "prismarine-nbt";
import { promisify } from "util";
import { AuctionModel } from "../models/auctionItem";
import { rgbToHex } from ".";
import { getAuctionPage, getBazaarItemPrice } from "./hypixelApi";
import { BAZAAR_ITEM_IDS } from "../data";
import logger from "../utils/logger";

export async function getAllAuctionItems() {
  let auctionItems: IAuctionItem[] = [];
  const firstPage = await getAuctionPage();
  if (firstPage) {
    const formattedFirstPageAuctions = await Promise.all(
      firstPage.auctions.map(async (auction) => {
        auction.itemData = await parseItemData(auction.item_bytes);
        return auction;
      })
    );
    auctionItems = auctionItems.concat(formattedFirstPageAuctions);
    for (let i = 1; i < firstPage.totalPages; i++) {
      const fetchedPage = await getAuctionPage(i);
      if (fetchedPage) {
        const formattedFetchedPageAuctions = await Promise.all(
          fetchedPage.auctions.map(async (auction) => {
            auction.itemData = await parseItemData(auction.item_bytes);
            return auction;
          })
        );
        auctionItems = auctionItems.concat(formattedFetchedPageAuctions);
      }
    }
  }
  logger.info(`AUCTIONS`, `All auction pages have been fetched!`);
  return auctionItems;
}

export async function updateAuctionItemPrices(auctionItems: IAuctionItem[]) {
  if (!auctionItems?.length) return;

  let checkedItemNames: string[] = [];
  for (const auctionItem of auctionItems) {
    const itemName = auctionItem.item_name.replace(/§./gm, "");
    if (checkedItemNames.includes(itemName)) continue;

    const cheapestToExpensiveItems = auctionItems
      .filter(
        (item) =>
          item.item_name.replace(/§./gm, "") === itemName &&
          item.itemData?.id === auctionItem.itemData?.id
      )
      .sort((auctionA, auctionB) => {
        const auctionAPrice = auctionA.bin
          ? auctionA.starting_bid
          : auctionA.highest_bid_amount;
        const auctionBPrice = auctionB.bin
          ? auctionB.starting_bid
          : auctionB.highest_bid_amount;

        if (auctionAPrice > auctionBPrice) return 1;
        else return -1;
      });

    const cheapestItem = cheapestToExpensiveItems[0];
    const expensiveItem =
      cheapestToExpensiveItems[cheapestToExpensiveItems.length - 1];
    const cheapestItemPrice = cheapestItem.bin
      ? cheapestItem.starting_bid
      : cheapestItem.highest_bid_amount;
    const expensiveItemPrice = expensiveItem.bin
      ? expensiveItem.starting_bid
      : expensiveItem.highest_bid_amount;

    const dupe = await AuctionModel.findOne({
      itemName: itemName,
    });
    if (dupe) {
      dupe.minimumItemPrice = cheapestItemPrice;
      dupe.maximumItemPrice = expensiveItemPrice;
      dupe.createdAt = new Date();
      await dupe.save();
    } else {
      await AuctionModel.create({
        itemId: cheapestItem.itemData?.id,
        itemName,
        minimumItemPrice: cheapestItemPrice,
        maximumItemPrice: expensiveItemPrice,
        createdAt: new Date(),
      });
    }

    checkedItemNames.push(itemName);
  }
  logger.info(`AUCTIONS`, `All items have been updated in the database!`);
}

const parseNbt = promisify(parse);
export async function parseInventoryData(nbt: string, checkPrice = false) {
  if (!nbt) return [];
  const bufferData = Buffer.from(nbt, "base64");
  if (!bufferData) return [];
  const parsedNbt = await parseNbt(bufferData);
  if (!parsedNbt) return [];
  const items = simplify(parsedNbt).i as NBTData[];
  if (!items?.length) return [];
  return await Promise.all(items.map((item) => Item(item, checkPrice)));
}

export async function parseItemData(nbt: string, checkPrice = false) {
  if (!nbt) return null;
  const bufferData = Buffer.from(nbt, "base64");
  const parsedNbt = await parseNbt(bufferData);
  const item = simplify(parsedNbt).i[0] as NBTData;
  return await Item(item, checkPrice);
}

export async function parseBackpackData(nbt: number[], checkPrice = false) {
  if (!nbt) return [];
  const bufferData = Buffer.from(nbt);
  if (!bufferData) return [];
  const parsedNbt = await parseNbt(bufferData);
  if (!parsedNbt) return [];
  const items = simplify(parsedNbt).i as NBTData[];
  if (!items?.length) return [];
  return await Promise.all(items.map((item) => Item(item, checkPrice)));
}

export async function checkItemPrice(item: IItem) {
  if (item.recombobulated) {
    const recombobPrice = await getBazaarItemPrice("RECOMBOBULATOR_3000");
    item.worth += recombobPrice;
  }

  if (BAZAAR_ITEM_IDS.includes(item.id)) {
    const itemPrice = await getBazaarItemPrice(item.id);
    item.worth += itemPrice * item.amount;
  } else {
    const auctionItem = await AuctionModel.findOne({
      itemId: item.id,
    });
    if (auctionItem) {
      item.worth += auctionItem.minimumItemPrice * item.amount;
    }
  }

  return item;
}

export async function Item(uItem: NBTData, worth: boolean) {
  let item: IItem = {
    id: "",
    displayName: "",
    lore: [],
    amount: 1,
    recombobulated: false,
    hotPotatoCount: 0,
    enchantments: [],
  };

  if (
    uItem.tag?.ExtraAttributes?.enchantments &&
    Object.keys(uItem.tag?.ExtraAttributes?.enchantments)?.length
  ) {
    const enchantmentsEntries = Object.entries(
      uItem.tag?.ExtraAttributes?.enchantments
    );
    const enchantments = enchantmentsEntries.map((x) => {
      return { enchantName: x[0], enchantLevel: x[1] };
    });
    item.enchantments = enchantments;
  }

  const hexCodes = uItem.tag?.ExtraAttributes?.color?.split(":");
  if (hexCodes?.length === 3) {
    item.color = rgbToHex(hexCodes[0], hexCodes[1], hexCodes[2]);
  }

  item.lore = uItem.tag?.display?.Lore?.map((str) => str.replace(/§./gm, ""));
  item.hotPotatoCount = uItem.tag?.ExtraAttributes?.hot_potato_count || 0;
  item.recombobulated = uItem.tag?.ExtraAttributes?.rarity_upgrades === 1;
  item.displayName = uItem.tag?.display?.Name?.replace(/§./gm, "");
  item.id = uItem.tag?.ExtraAttributes?.id;
  item.amount = uItem.Count || 1;

  const uItemId = uItem.tag?.ExtraAttributes?.id?.toLowerCase();
  if (uItemId?.includes("backpack")) {
    if (uItemId === "small_backpack")
      item.backpackItems = await parseBackpackData(
        uItem.tag.ExtraAttributes.small_backpack_data
      );
    else if (uItemId === "medium_backpack")
      item.backpackItems = await parseBackpackData(
        uItem.tag.ExtraAttributes.medium_backpack_data
      );
    else if (uItemId === "large_backpack")
      item.backpackItems = await parseBackpackData(
        uItem.tag.ExtraAttributes.large_backpack_data
      );
    else if (uItemId === "greater_backpack")
      item.backpackItems = await parseBackpackData(
        uItem.tag.ExtraAttributes.greater_backpack_data
      );
    else if (uItemId === "jumbo_backpack")
      item.backpackItems = await parseBackpackData(
        uItem.tag.ExtraAttributes.jumbo_backpack_data
      );
  }

  if (worth) {
    if (item.recombobulated) {
      const recombobPrice = await getBazaarItemPrice("RECOMBOBULATOR_3000");
      item.worth += recombobPrice;
    }

    if (BAZAAR_ITEM_IDS.includes(item.id)) {
      const itemPrice = await getBazaarItemPrice(item.id);
      item.worth += itemPrice * item.amount;
    } else {
      const auctionItem = await AuctionModel.findOne({
        itemId: item.id,
      });
      if (auctionItem) {
        item.worth += auctionItem.minimumItemPrice * item.amount;
      }
    }
  }

  return item;
}
