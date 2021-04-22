import Mineflayer from "mineflayer";
import { sleep } from ".";
import { validArmor, validWeapons } from "../config";
import { AccountModel } from "../models/account";
import { ArchivedModel } from "../models/archived";
import { parseInventoryData } from "./hypixel";
import { HypixelAPI } from "./hypixelApi";
import { IProfileMember } from "./interfaces";
import Logger from "./logger";

type Player = { username: string; uuid: string };

export default class Scraper {
  constructor(
    private email: string,
    private password: string,
    private apiKey: string
  ) {
    this.startup();
  }

  loginOptions = {
    host: "hypixel.net",
    username: this.email,
    password: this.password,
  };

  mineflayerBot = Mineflayer.createBot(this.loginOptions);
  hypixelApi = new HypixelAPI(this.apiKey);

  accountUsernameQueue: Player[] = [];
  accountUsernamesChecked: Player[] = [];

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

    this.mineflayerBot.on("error", () => {
      this.online = false;
      setTimeout(() => {
        this.mineflayerBot.end();
        this.mineflayerBot = Mineflayer.createBot(this.loginOptions);
        this.startup();
      }, 30e3);
    });

    this.mineflayerBot.on("end", function () {
      this.online = false;
      setTimeout(() => {
        this.mineflayerBot = Mineflayer.createBot(this.loginOptions);
        this.startup();
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
    Logger.info(
      `SCRAPING`,
      `Scraped and filtering ${filteredPlayers.length} players on ${this.mineflayerBot.username} account.`
    );

    // Filter hit and trash players.
    for (const player of this.accountUsernameQueue.slice(0, 50)) {
      // Get all player profiles
      const skyblockProfiles = await this.hypixelApi.getSkyblockProfile(
        player.uuid
      );
      if (!skyblockProfiles?.length) {
        Logger.warn(`FILTER`, `Unabled to fetch ${player.username} profiles.`);
        break;
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
          const archivedModel = await ArchivedModel.findOne({
            username: player.username,
          });

          if (
            (accountModel?.items.length &&
              accountModel?.items?.includes(item.displayName)) ||
            (archivedModel?.items.length &&
              archivedModel?.items?.includes(item.displayName))
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
