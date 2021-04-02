import logger from "../utils/logger";
import Event, { EventNameType } from ".";
import { AccountModel } from "../models/account";
import Mineflayer from "mineflayer";
import { config as dotenv } from "dotenv";
import { Profile } from "../utils/interfaces";
import { getHypixelPlayer, getSkyblockProfile } from "../utils/hypixelApi";
import {
  getAllAuctionItems,
  parseInventoryData,
  updateAuctionItemPrices,
} from "../utils/hypixel";
import { sleep } from "../utils";
import { ArchivedModel } from "../models/archived";
import { TimestampModel } from "../models/timestamp";
import { accounts } from "../config";

dotenv();

export default class Started extends Event {
  eventName: EventNameType = "ready";

  async handle() {
    logger.info("BOT", "The bot has started!");

    for (let i = 0; i < 5; i++) {
      startAccountFetcher(
        accounts[i].email,
        accounts[i].password,
        accounts[i].apiKey
      );
    }

    await startAuctionUpdater();
    setInterval(async () => await startAuctionUpdater());
  }
}

async function startAuctionUpdater() {
  const auctionsLastUpdate = await TimestampModel.findOne({
    category: "AUCTIONS_LAST_UPDATE",
  });
  if (
    !auctionsLastUpdate ||
    auctionsLastUpdate?.lastTime + 6 * 60 * 60e3 <= Date.now()
  ) {
    await updateAuctionItemPrices(await getAllAuctionItems());
    logger.info(`AUCTION_ITEMS`, `Auction items updated!`);
  }

  if (auctionsLastUpdate?.lastTime + 6 * 60 * 60e3 <= Date.now()) {
    auctionsLastUpdate.lastTime = Date.now();
    await auctionsLastUpdate.save();
  } else {
    await TimestampModel.create({
      category: "AUCTIONS_LAST_UPDATE",
      lastTime: Date.now(),
    });
  }
}

function startAccountFetcher(email: string, pass: string, apiKey: string) {
  const client = Mineflayer.createBot({
    host: "hypixel.net",
    username: email,
    password: pass,
  });

  client.on("kicked", console.log);
  client.on("error", console.log);
  client.once("spawn", async () => {
    await sleep(5000);
    client.chat("/skyblock");
    await sleep(5000);
    logger.info("BOT", `${client.username} is now scraping players`);
    await startScrapeProcess(client, apiKey);
  });
}

const validWeapons = [
  "SHADOW_FURY",
  "VALKYRIE",
  "SCYLLA",
  "ASTRAEA",
  "HYPERION",
  "BONE_BOOMERANG",
];

const validArmor = [
  "POWER_WITHER_HELMET",
  "POWER_WITHER_CHESTPLATE",
  "POWER_WITHER_LEGGINGS",
  "POWER_WITHER_BOOTS",

  "WITHER_GOGGLES",
  "WISE_WITHER_HELMET",
  "WISE_WITHER_CHESTPLATE",
  "WISE_WITHER_LEGGINGS",
  "WISE_WITHER_BOOTS",

  "TANK_WITHER_HELMET",
  "TANK_WITHER_CHESTPLATE",
  "TANK_WITHER_LEGGINGS",
  "TANK_WITHER_BOOTS",

  "SPEED_WITHER_HELMET",
  "SPEED_WITHER_CHESTPLATE",
  "SPEED_WITHER_LEGGINGS",
  "SPEED_WITHER_BOOTS",
];

async function startScrapeProcess(client: Mineflayer.Bot, apiKey: string) {
  let playersList = await getDungeonHubPlayerList(client);
  if (!playersList)
    return logger.error(
      `SCRAPING_PROCESS`,
      `"${client.username}" failed to fetch the players list of a dungeons lobby.`
    );

  for (const player of playersList.slice(0, 50)) {
    await processAcount(player.username, player.uuid, apiKey);
  }

  // Restart process
  setTimeout(async () => await startScrapeProcess(client, apiKey), 120 * 1000);
}

export async function processAcount(
  playerUsername: string,
  playerUuid: string,
  apiKey: string
) {
  // Get all player profiles
  const skyblockProfiles = await getSkyblockProfile(playerUuid, apiKey);
  if (!skyblockProfiles?.length) return;

  // Scrape all player items
  const playersItemsData = await scrapeProfilesItems(
    skyblockProfiles,
    playerUuid
  );
  if (!playersItemsData?.length) return;

  // Check 5 starred weapon: skip
  const fiveStarredWeapon = playersItemsData.some(
    (item) =>
      validWeapons.includes(item.id) &&
      item.displayName?.match(/✪/gm)?.length === 5
  );
  if (fiveStarredWeapon) return;

  // Check over 3 five starred items: skip
  const fiveStarredItems = playersItemsData.filter(
    (item) =>
      item.displayName?.match(/✪/gm)?.length === 5 &&
      (validArmor.includes(item.id) || validWeapons.includes(item.id))
  );
  if (fiveStarredItems.length >= 3) return;

  // Check for hit items
  const valuableItems = playersItemsData.filter(
    (item) =>
      item.displayName?.match(/✪/gm)?.length !== 5 &&
      (validArmor.includes(item.id) || validWeapons.includes(item.id))
  );
  if (!valuableItems.length) return;

  for (const item of valuableItems) {
    // MVP++ Check
    const playerData = await getHypixelPlayer(playerUuid);
    if (playerData?.monthlyPackageRank === "SUPERSTAR") continue;

    // Duplicate account check
    const accountDuplicate = await AccountModel.findOne({
      username: playerUsername,
      itemName: item.displayName,
    });
    const archivedDuplicate = await ArchivedModel.findOne({
      username: playerUsername,
      itemName: item.displayName,
    });

    // Account hit
    if (!archivedDuplicate && !accountDuplicate) {
      logger.info(`HIT`, `${playerUsername} | ${item.displayName}`);
      await AccountModel.create({
        username: playerUsername,
        itemName: item.displayName,
        createdAt: new Date(),
      });
    }
  }
}

export async function scrapeProfilesItems(
  skyblockProfiles: Profile[],
  playerUuid: string
) {
  return (
    await Promise.all(
      skyblockProfiles.map(async (profile) => {
        const memberProfile = profile.members[playerUuid];
        if (!memberProfile) return;

        const enderChest = await parseInventoryData(
          memberProfile.ender_chest_contents?.data
        );
        const wardrobe = await parseInventoryData(
          memberProfile.wardrobe_contents?.data
        );
        const inventory = await parseInventoryData(
          memberProfile.inv_contents?.data
        );
        const armor = await parseInventoryData(memberProfile.inv_armor?.data);

        const currentProfileItems = enderChest.concat(
          wardrobe,
          inventory,
          armor
        );
        const backpackItems = currentProfileItems
          .map((item) => item.backpackItems)
          .filter((x) => !!x)
          .flat();

        return currentProfileItems.concat(backpackItems);
      })
    )
  )
    .filter((x) => !!x)
    .flat();
}

let cachedPlayers: string[] = [];
async function getDungeonHubPlayerList(client: Mineflayer.Bot) {
  client.chat("/hub");
  await sleep(2000);
  client.chat("/warp dungeon_hub");
  await sleep(2000);

  const players = Object.values(client.players);
  if (!players.length) return [];

  let uncachedPlayers: { username: string; uuid: string }[] = [];
  for (const player of players) {
    if (cachedPlayers.includes(player.username)) continue;
    if (player.username.includes("!")) continue;
    if (player.username.toLowerCase() === client.username.toLowerCase())
      continue;

    cachedPlayers.push(player.username);
    uncachedPlayers.push({
      username: player.username,
      uuid: player.uuid.replace(/-/gm, ""),
    });
  }
  return uncachedPlayers;
}
