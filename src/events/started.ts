import logger from "../utils/logger";
import Event, { EventNameType } from ".";
import { StarsModel } from "../models/stars";
import fetch from "node-fetch";
import { promisify } from "util";
import Mineflayer from "mineflayer";
import prismarine from "prismarine-nbt";
import { config as dotenv } from "dotenv";
import ISkyblockProfilesResponse, { NBTData } from "../utils/interfaces";
import { colorCodes, valuableItems } from "../utils/extra";

dotenv();

export default class Started extends Event {
  eventName: EventNameType = "ready";

  async handle() {
    logger.info("BOT", "The bot has started!");
    await startFetchingPlayers();
  }
}

async function startFetchingPlayers() {
  const client = Mineflayer.createBot({
    host: "hypixel.net",
    username: "nikkipearson20@yahoo.com",
    password: "Malek132$",
  });

  client.on("kicked", console.log);
  client.on("error", console.log);
  client.once("spawn", async () => {
    await sleep(5000);
    client.chat("/skyblock");
    await sleep(5000);
    logger.info("BOT", `Player scraping process has begun.`);
    await startScrapeProcess(client);
  });
}

let cachedPlayers: {
  uuid: string;
  username: string;
}[] = [];

async function startScrapeProcess(client: Mineflayer.Bot) {
  const playersList = await getDungeonHubPlayerList(client);
  for (const player of playersList) {
    const playersItemsData = await getAllPlayersItems(player.uuid);
    if (!playersItemsData) continue;

    const fiveStarredItem = playersItemsData.filter(
      (item) => item.tag?.display?.Name?.match(/✪/gm)?.length === 5
    );
    if (fiveStarredItem.length >= 3) continue;

    const valuableNonFiveStarred = playersItemsData.filter(
      (item) =>
        item.tag?.ExtraAttributes?.id &&
        valuableItems.includes(item.tag.ExtraAttributes.id) &&
        item.tag.display.Name.match(/✪/gm)?.length >= 1 &&
        item.tag.display.Name.match(/✪/gm)?.length <= 4
    );
    for (const item of valuableNonFiveStarred) {
      const duplicate = await StarsModel.findOne({
        username: player.username,
        itemName: item.tag.display.Name,
      });
      if (!duplicate) {
        await StarsModel.create({
          username: player.username,
          itemName: item.tag.display.Name,
          createdAt: new Date(),
        });
      }
    }
  }
  setTimeout(async () => await startScrapeProcess(client), 60 * 1000);
}

function convertProperties(item: NBTData) {
  if (item.tag?.display?.Name) {
    item.tag.display.Name = item.tag.display.Name.replace(/§./gm, "");
  }
  if (item.tag?.display?.Lore) {
    item.tag.display.Lore = item.tag.display.Lore.map((str) =>
      str.replace(/§./gm, "")
    );
  }
  if (item.tag?.ExtraAttributes?.color) {
    const hexCodes = item.tag.ExtraAttributes.color.split(":");
    item.tag.ExtraAttributes.color = rgbToHex(
      hexCodes[0],
      hexCodes[1],
      hexCodes[2]
    );
  }
  return item;
}

async function getAllPlayersItems(playerUuid: string) {
  const request = await fetch(
    `https://api.hypixel.net/skyblock/profiles?key=${process.env.HYPIXEL_API_KEY}&uuid=${playerUuid}`
  );
  if (!request.ok) return;

  const response = (await request.json()) as ISkyblockProfilesResponse;
  if (response?.profiles) {
    let totalItems: NBTData[] = [];
    for (const profile of response.profiles) {
      let currentProfileItems: NBTData[] = [];
      const memberProfile = profile.members[playerUuid];

      const enderChest = memberProfile.ender_chest_contents?.data
        ? await parseInventoryData(memberProfile.ender_chest_contents?.data)
        : null;
      const wardrobe = memberProfile.wardrobe_contents?.data
        ? await parseInventoryData(memberProfile.wardrobe_contents?.data)
        : null;
      const inventory = memberProfile.inv_contents?.data
        ? await parseInventoryData(memberProfile.inv_contents?.data)
        : null;

      if (enderChest)
        currentProfileItems = currentProfileItems.concat(enderChest);
      if (wardrobe) currentProfileItems = currentProfileItems.concat(wardrobe);
      if (inventory)
        currentProfileItems = currentProfileItems.concat(inventory);

      const backpacks = await getBackpacksAndData(currentProfileItems);
      if (backpacks)
        currentProfileItems = currentProfileItems.concat(backpacks);

      totalItems = totalItems.concat(currentProfileItems);
    }

    return totalItems.map((item) => convertProperties(item));
  }
}

async function getDungeonHubPlayerList(client: Mineflayer.Bot) {
  client.chat("/hub");
  await sleep(2000);
  client.chat("/warp dungeon_hub");
  await sleep(2000);

  const players = Object.values(client.players);
  const uncachedPlayers = players
    .filter(
      (player) =>
        !cachedPlayers.includes(player) &&
        !player.username.includes("!") &&
        player.username.toLowerCase() !== client.username.toLowerCase()
    )
    .map((player) => {
      return {
        uuid: player.uuid.replace(/-/gm, ""),
        username: player.username,
      };
    });
  cachedPlayers = cachedPlayers.concat(uncachedPlayers);
  return uncachedPlayers;
}

const parseNbt = promisify(prismarine.parse);
async function parseInventoryData(nbt: string) {
  const bufferData = Buffer.from(nbt, "base64");
  const parsedNbt = await parseNbt(bufferData);
  return prismarine.simplify(parsedNbt).i as NBTData[];
}

async function parseBackpackData(nbt: any[]) {
  const bufferData = Buffer.from(nbt);
  const parsedNbt = await parseNbt(bufferData);
  return prismarine.simplify(parsedNbt).i as NBTData[];
}

async function getBackpacksAndData(inventoryData: NBTData[]) {
  const backpacksData = inventoryData
    .filter((x: NBTData) =>
      x.tag?.ExtraAttributes?.id?.toLowerCase().includes("backpack")
    )
    .map((x: NBTData) => {
      if (x.tag.ExtraAttributes.id.toLowerCase() === "small_backpack")
        return x.tag.ExtraAttributes.small_backpack_data;
      if (x.tag.ExtraAttributes.id.toLowerCase() === "medium_backpack")
        return x.tag.ExtraAttributes.medium_backpack_data;
      if (x.tag.ExtraAttributes.id.toLowerCase() === "large_backpack")
        return x.tag.ExtraAttributes.large_backpack_data;
      if (x.tag.ExtraAttributes.id.toLowerCase() === "greater_backpack")
        return x.tag.ExtraAttributes.greater_backpack_data;
      if (x.tag.ExtraAttributes.id.toLowerCase() === "jumbo_backpack")
        return x.tag.ExtraAttributes.jumbo_backpack_data;
    })
    .filter((data) => !!data);
  return (
    await Promise.all(backpacksData.map((x) => parseBackpackData(x)))
  ).flat();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rgbToHex(r: string, g: string, b: string) {
  const componentToHex = (hex: string) => (hex.length == 1 ? "0" + hex : hex);
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
