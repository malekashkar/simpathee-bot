import Mineflayer from "mineflayer";
import { sleep } from ".";
import { validArmor, validWeapons } from "../config";
import { AccountModel } from "../models/account";
import { ArchivedModel } from "../models/archived";
import { parseInventoryData } from "./hypixel";
import { HypixelAPI } from "./hypixelApi";
import { IItem, IProfileMember } from "./interfaces";
import Logger from "./logger";

type Player = { username: string; uuid: string };

export default class Scraper {
  bot: Mineflayer.Bot;
  hypixelApi: HypixelAPI;

  accountUsernameQueue: Player[] = [];
  accountUsernamesChecked: Player[] = [];

  constructor(
    private email: string,
    private password: string,
    private apiKey: string
  ) {
    this.bot = Mineflayer.createBot({
      host: "hypixel.net",
      username: this.email,
      password: this.password,
    });
    this.hypixelApi = new HypixelAPI(this.apiKey);

    this.process();
  }

  async process() {
    this.bot.once("spawn", async () => {
      Logger.info(
        `SCRAPING`,
        `Started scraping process on ${this.bot.username}.`
      );

      await this.teleportDungeonHub();
      await this.scrapePlayers();
      await this.filterQueue();
      setInterval(async () => {
        await this.teleportDungeonHub();
        await this.scrapePlayers();
        await this.filterQueue();
      }, 60e3);
    });
  }

  async scrapePlayers() {
    const filteredPlayers = Object.values(this.bot.players)
      .filter(
        (player) =>
          !player.username.includes("!") &&
          player.username.toLowerCase() !== this.bot.username.toLowerCase() &&
          !this.accountUsernamesChecked.some(
            (account) => account.username === player.username
          ) &&
          !this.accountUsernameQueue.some(
            (account) => account.username === player.username
          ) &&
          player.gamemode === 2
      )
      .map((account) => {
        return {
          username: account.username,
          uuid: account.uuid.replace(/-/gm, ""),
        };
      });
    this.accountUsernameQueue = this.accountUsernameQueue.concat(
      filteredPlayers
    );
    Logger.info(`SCRAPING`, `Scraped players on ${this.bot.username}.`);
  }

  async filterQueue() {
    Logger.info(
      `SCRAPING`,
      `Filtering players on account ${this.bot.username}.`
    );
    for (const player of this.accountUsernameQueue.slice(0, 50)) {
      Logger.info(`FILTER`, `Filtering the player ${player.username}.`);
      const itemFilter = await this.filterPlayerDetails(player);
      if (itemFilter)
        await this.processPlayerItems(player.username, itemFilter);
    }
    Logger.info(
      `SCRAPING`,
      `Finished filtering players on account ${this.bot.username}.`
    );
  }

  async filterPlayerDetails(player: Player) {
    // Get all player profiles
    const skyblockProfiles = await this.hypixelApi.getSkyblockProfile(
      player.uuid
    );
    if (!skyblockProfiles?.length) {
      Logger.warn(`FILTER`, `Unabled to fetch ${player.username} profiles.`);
      return;
    } else {
      this.accountUsernamesChecked.push(player);
      this.accountUsernameQueue = this.accountUsernameQueue.filter(
        (qPlayer) => qPlayer !== player
      );
    }

    // Get member profile
    const memberProfile = skyblockProfiles.sort((profilea, profileb) => {
      if (
        profilea.members[player.uuid].last_save >
        profileb.members[player.uuid].last_save
      )
        return -1;
      else return 1;
    })[0]?.members[player.uuid];
    if (!memberProfile) {
      Logger.warn(
        `FILTER`,
        `Unabled to fetch ${player.username} member profile.`
      );
      return;
    }

    // Scrape all player items
    const playersItemsData = await this.scrapeProfilesItems(memberProfile);
    if (!playersItemsData?.length) {
      Logger.warn(
        `FILTER`,
        `Unabled to scrape ${player.username} profile items.`
      );
      return;
    }

    // Check 5 starred weapon: skip
    const fiveStarredWeapon = playersItemsData.some(
      (item) =>
        validWeapons.includes(item.id) &&
        item.displayName?.match(/✪/gm)?.length === 5
    );
    if (fiveStarredWeapon) {
      Logger.warn(`FILTER`, `${player.username} has a five starred weapon.`);
      return;
    }

    // Check over 3 five starred items: skip
    const fiveStarredItems = playersItemsData.filter(
      (item) =>
        item.displayName?.match(/✪/gm)?.length === 5 &&
        (validArmor.includes(item.id) || validWeapons.includes(item.id))
    );
    if (fiveStarredItems.length >= 3) {
      Logger.warn(
        `FILTER`,
        `${player.username} has a over three five starred items.`
      );
      return;
    }

    // MVP++ Check
    const playerData = await this.hypixelApi.getHypixelPlayer(player.uuid);
    if (playerData?.monthlyPackageRank === "SUPERSTAR") {
      Logger.warn(`FILTER`, `${player.username} has MVP++.`);
      return;
    }

    // Check for hit items
    const valuableItems = playersItemsData.filter(
      (item) =>
        item.displayName?.match(/✪/gm)?.length !== 5 &&
        (validArmor.includes(item.id) || validWeapons.includes(item.id))
    );
    if (valuableItems.length) {
      Logger.info(
        `FILTER`,
        `${player.username} seems to have some sexy items.`
      );
      return valuableItems;
    } else {
      Logger.warn(
        `FILTER`,
        `${player.username} has no valuable items to offer.`
      );
    }
  }

  async processPlayerItems(playerUsername: string, playerItems: IItem[]) {
    for (const item of playerItems) {
      const accountDuplicate = await AccountModel.findOne({
        username: playerUsername,
        itemName: item.displayName,
      });
      const archivedDuplicate = await ArchivedModel.findOne({
        username: playerUsername,
        itemName: item.displayName,
      });

      if (!archivedDuplicate && !accountDuplicate) {
        Logger.info(`HIT`, `${playerUsername} | ${item.displayName}`);
        await AccountModel.create({
          username: playerUsername,
          itemName: item.displayName,
          createdAt: new Date(),
        });
      }
    }
  }

  async scrapeProfilesItems(memberProfile: IProfileMember) {
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

    const currentProfileItems = enderChest.concat(wardrobe, inventory, armor);
    const backpackItems = currentProfileItems
      .map((item) => item.backpackItems)
      .filter((x) => !!x)
      .flat();

    return currentProfileItems.concat(backpackItems);
  }

  async teleportDungeonHub() {
    await sleep(5000);
    this.bot.chat("/skyblock");
    await sleep(5000);
    this.bot.chat("/skyblock");
    await sleep(5000);
    this.bot.chat("/warp hub");
    await sleep(5000);
    this.bot.chat("/warp dungeon_hub");
    await sleep(5000);
  }
}
