import { IAuctionItem, IBazaarProduct, IItem, NBTData } from "./interfaces";
import { parse, simplify } from "prismarine-nbt";
import { promisify } from "util";
import { AuctionModel } from "../models/auctionItem";
import { rgbToHex } from ".";
import { BAZAAR_ITEM_IDS } from "../data";
import { BazaarModel } from "../models/bazaarItem";
import { HypixelAPI } from "./hypixelApi";

export async function getAllAuctionItems(hypixelApi: HypixelAPI) {
  let auctionItems: IAuctionItem[] = [];
  const firstPage = await hypixelApi.getAuctionPage();
  if (firstPage) {
    const formattedFirstPageAuctions = await Promise.all(
      firstPage.auctions.map(async (auction) => {
        auction.itemData = await parseItemData(auction.item_bytes);
        return auction;
      })
    );
    auctionItems = auctionItems.concat(formattedFirstPageAuctions);
    for (let i = 1; i < firstPage.totalPages; i++) {
      const fetchedPage = await hypixelApi.getAuctionPage(i);
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
  return auctionItems;
}

export async function updateAuctionItemPrices(auctionItems: IAuctionItem[]) {
  if (!auctionItems?.length) return;

  let checkedItemNames: string[] = [];
  for (const auctionItem of auctionItems) {
    const itemName = auctionItem.item_name.replace(/§./gm, "");
    if (checkedItemNames.includes(itemName)) continue;

    if(auctionItem.itemData.enchantments.length) {
      
    }

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
}

export async function updateBazaarItemPrices(bazaarItems: IBazaarProduct[]) {
  if (!bazaarItems?.length) return;

  for (const bazaarItem of bazaarItems) {
    const dupe = await BazaarModel.findOne({
      itemId: bazaarItem.product_id,
    });
    if (dupe) {
      dupe.sellVolume = bazaarItem.quick_status.sellVolume;
      dupe.buyVolume = bazaarItem.quick_status.buyVolume;
      dupe.sellPrice = bazaarItem.quick_status.sellPrice;
      dupe.buyPrice = bazaarItem.quick_status.buyPrice;
      dupe.createdAt = new Date();
      await dupe.save();
    } else {
      await BazaarModel.create({
        itemId: bazaarItem.product_id,
        sellVolume: bazaarItem.quick_status.sellVolume,
        buyVolume: bazaarItem.quick_status.buyVolume,
        sellPrice: bazaarItem.quick_status.sellPrice,
        buyPrice: bazaarItem.quick_status.buyPrice,
        createdAt: new Date(),
      });
    }
  }
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
  return await Promise.all(
    items.map(async (item) => await Item(item, checkPrice))
  );
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
  return await Promise.all(
    items.map(async (item) => await Item(item, checkPrice))
  );
}

export async function checkItemPrice(item: IItem) {
  if (item.recombobulated) {
    const recombobPrice = await BazaarModel.findOne({
      itemId: "RECOMBOBULATOR_3000",
    });
    if (recombobPrice?.buyPrice) item.worth += recombobPrice.buyPrice;
  }

  if (BAZAAR_ITEM_IDS.includes(item.id)) {
    const itemPrice = await BazaarModel.findOne({
      itemId: item.id,
    });
    if (itemPrice?.buyPrice) item.worth += itemPrice.buyPrice * item.amount;
  } else {
    const auctionItem = await AuctionModel.findOne({
      itemId: item.id,
    });
    if (auctionItem) {
      item.worth += auctionItem.minimumItemPrice * item.amount;
    }
  }

  if (item.hotPotatoCount) {
    const hotPotatoBookPrice = 10;
    if (item.hotPotatoCount <= 10) {
      item.worth += hotPotatoBookPrice * item.hotPotatoCount;
    } else {
      const fumingHotPotatoBookPrice = 20;
      item.worth += hotPotatoBookPrice * 10;
      item.worth += fumingHotPotatoBookPrice * (item.hotPotatoCount - 10);
    }
  }

  if (false) {
    // item.enchantments.length
    for (const enchantment of item.enchantments) {
      const auctionItem = await AuctionModel.findOne({
        itemName: `${enchantment.enchantName} ${enchantment.enchantLevel}`,
      });
      if (auctionItem) {
        item.worth += auctionItem.minimumItemPrice;
      }
    }
  }

  if (item.backpackItems?.length) {
    for (const backpackItem of item.backpackItems) {
      const price = await checkItemPrice(backpackItem);
      if (price?.worth) item.worth += price.worth;
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
    worth: 0,
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

  if (worth) return await checkItemPrice(item);
  else return item;
}
