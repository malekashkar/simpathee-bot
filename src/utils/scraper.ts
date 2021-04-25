import Mineflayer from "mineflayer";
import { sleep } from ".";
import { validArmor, validWeapons } from "../config";
import { AccountModel } from "../models/account";
import { BlacklistedModel } from "../models/blacklisted";
import { parseInventoryData } from "./hypixel";
import { HypixelAPI } from "./hypixelApi";
import { IProfileMember } from "./interfaces";
import Logger from "./logger";

type Player = { username: string; uuid: string };
export type Account = { email: string; password: string; apiKey: string };

export default class Scraper {
  constructor(private account: Account) {
    this.startup();
  }

  loginOptions = {
    host: "hypixel.net",
    username: this.account.email,
    password: this.account.password,
  };

  mineflayerBot = Mineflayer.createBot(this.loginOptions);
  hypixelApi = new HypixelAPI(this.account.apiKey);

  queue: Player[] = [];
  online = false;

  async startup() {
    this.mineflayerBot.once("spawn", async () => {
      Logger.info(
        `ACCOUNT`,
        `Account ${this.mineflayerBot.username} has logged into Hypixel.`
      );

      this.online = true;
      await this.startPlayerScrape();

      const checker = setInterval(async () => {
        if (this.online) {
          await this.startPlayerScrape();
        } else {
          clearInterval(checker);
        }
      }, 60e3);
    });

    const that = this;
    this.mineflayerBot.on("error", (err: any) => {
      console.log(err);
      this.online = false;
      setTimeout(() => {
        this.mineflayerBot.end();
        this.mineflayerBot = Mineflayer.createBot(this.loginOptions);
        that.startup();
      }, 30e3);
    });

    this.mineflayerBot.on("end", () => {
      console.log("ended");
      this.online = false;
      setTimeout(() => {
        this.mineflayerBot = Mineflayer.createBot(this.loginOptions);
        that.startup();
      }, 30e3);
    });
  }

  async startPlayerScrape() {
    // Go to dungeon hub lobby
    await sleep(10e3);
    this.mineflayerBot.chat("/skyblock");
    Logger.info(
      `WARP`,
      `${this.mineflayerBot.username} has warped to Skyblock.`
    );
    await sleep(10e3);
    this.mineflayerBot.chat("/warp hub");
    Logger.info(
      `WARP`,
      `${this.mineflayerBot.username} has warped to Skyblock HUB.`
    );
    await sleep(10e3);
    this.mineflayerBot.chat("/warp dungeon_hub");
    Logger.info(
      `WARP`,
      `${this.mineflayerBot.username} has warped to Skyblock Dungeon HUB.`
    );
    await sleep(10e3);

    // Scrape player names from lobby
    const filteredPlayers = Object.values(this.mineflayerBot.players)
      .filter(
        (player) =>
          !player.username.includes("!") &&
          player.username.toLowerCase() !==
            this.mineflayerBot.username.toLowerCase() &&
          !this.queue.some((account) => account.username === player.username) &&
          player.gamemode === 2
      )
      .map((account) => {
        return {
          username: account.username,
          uuid: account.uuid.replace(/-/gm, ""),
        };
      });
    this.queue = this.queue.concat(filteredPlayers);
    Logger.info(
      `SCRAPING`,
      `Scraped and filtering ${filteredPlayers.length} players on ${this.mineflayerBot.username} account.`
    );

    // Filter hit and trash players.
    for (const player of this.queue.slice(0, 50)) {
      // Get all player profiles
      const skyblockInfo = await this.hypixelApi.getSkyblockInformation(
        player.uuid
      );
      if (!skyblockInfo?.profiles?.length) {
        if (skyblockInfo === undefined) {
          Logger.warn(
            `FILTER`,
            `Unabled to fetch ${player.username} profiles.`
          );
          break;
        } else if (skyblockInfo.success && skyblockInfo.profiles === null) {
          this.queue = this.queue.filter((qPlayer) => qPlayer !== player);
          Logger.warn(
            `FILTER`,
            `Unabled to fetch ${player.username} profiles.`
          );
          continue;
        }
      } else {
        this.queue = this.queue.filter((qPlayer) => qPlayer !== player);
      }

      // Get member profile
      const memberProfile = skyblockInfo.profiles.sort((profilea, profileb) => {
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
        continue;
      }

      // Scrape all player items
      const playersItemsData = await this.scrapeProfilesItems(memberProfile);
      if (!playersItemsData?.length) {
        Logger.warn(
          `FILTER`,
          `Unabled to scrape ${player.username} profile items.`
        );
        continue;
      }

      // Check 5 starred weapon: skip
      const fiveStarredWeapon = playersItemsData.some(
        (item) =>
          validWeapons.includes(item.id) &&
          item.displayName?.match(/✪/gm)?.length === 5
      );
      if (fiveStarredWeapon) {
        Logger.warn(`FILTER`, `${player.username} has a five starred weapon.`);
        continue;
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
        continue;
      }

      // MVP++ Check
      const playerData = await this.hypixelApi.getHypixelPlayer(player.uuid);
      if (playerData?.monthlyPackageRank === "SUPERSTAR") {
        Logger.warn(`FILTER`, `${player.username} has MVP++.`);
        continue;
      }

      // Check for hit items
      const valuableItems = playersItemsData.filter(
        (item) =>
          item.displayName?.match(/✪/gm)?.length !== 5 &&
          (validArmor.includes(item.id) || validWeapons.includes(item.id))
      );
      if (valuableItems.length) {
        for (const item of valuableItems) {
          const accountModel = await AccountModel.findOne({
            username: player.username,
          });
          const blacklistedDocument = await BlacklistedModel.findOne({
            username: player.username,
          });

          if (
            blacklistedDocument ||
            accountModel?.items?.includes(item.displayName)
          )
            continue;

          if (accountModel) {
            accountModel.items.push(item.displayName);
            await accountModel.save();
          } else {
            await AccountModel.create({
              username: player.username,
              items: [item.displayName],
              createdAt: new Date(),
            });
          }

          Logger.info(`HIT`, `${player.username} | ${item.displayName}`);
        }
      } else {
        Logger.warn(
          `FILTER`,
          `${player.username} has no valuable items to offer.`
        );
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
}
