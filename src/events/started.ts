import logger from "../utils/logger";
import Event, { EventNameType } from ".";
import { config as dotenv } from "dotenv";
import {
  getAllAuctionItems,
  updateAuctionItemPrices,
  updateBazaarItemPrices,
} from "../utils/hypixel";
import { TimestampModel } from "../models/timestamp";
import { accounts } from "../config";
import { HypixelAPI } from "../utils/hypixelApi";
import Scraper from "../utils/scraper";
import { AccountModel } from "../models/account";

dotenv();

export default class Started extends Event {
  eventName: EventNameType = "ready";

  async handle() {
    logger.info("BOT", "The bot has started!");

    bazaarUpdater(this.client.hypixel);
    auctionUpdater(this.client.hypixel);
    setInterval(() => {
      auctionUpdater(this.client.hypixel);
      bazaarUpdater(this.client.hypixel);
    }, 60 * 60e3);

    accountArchiver();
    setInterval(() => {
      accountArchiver();
    }, 5 * 60e3);

    if (process.env.NODE_ENV === "production") {
      for (const account of accounts) {
        this.client.bots.push(new Scraper(account));
      }
    }
  }
}

async function accountArchiver() {
  const accountsLastUpdate = await TimestampModel.findOne({
    category: "ACCOUNTS_LAST_PURGE",
  });

  if (
    !accountsLastUpdate ||
    accountsLastUpdate?.lastTime + 30 * 60e3 <= Date.now()
  ) {
    await AccountModel.deleteMany({
      createdAt: { $lte: new Date(Date.now() - 30 * 60e3) },
    });
    logger.info(`ACCOUNTS`, `Outdated Accounts Cleared.`);
  }

  if (accountsLastUpdate?.lastTime + 30 * 60e3 <= Date.now()) {
    accountsLastUpdate.lastTime = Date.now();
    await accountsLastUpdate.save();
  } else if (!accountsLastUpdate) {
    await TimestampModel.create({
      category: "ACCOUNTS_LAST_PURGE",
      lastTime: Date.now(),
    });
  }
}

async function bazaarUpdater(hypixelApi: HypixelAPI) {
  const bazaarLastUpdate = await TimestampModel.findOne({
    category: "BAZAAR_LAST_UPDATE",
  });

  if (
    !bazaarLastUpdate ||
    bazaarLastUpdate?.lastTime + 6 * 60 * 60e3 <= Date.now()
  ) {
    logger.info(`BAZAAR`, `Started bazaar items scraping.`);
    await updateBazaarItemPrices(await hypixelApi.getBazaarItems());
    logger.info(`BAZAAR`, `Bazaar items updated!`);
  }

  if (bazaarLastUpdate?.lastTime + 6 * 60 * 60e3 <= Date.now()) {
    bazaarLastUpdate.lastTime = Date.now();
    await bazaarLastUpdate.save();
  } else if (!bazaarLastUpdate) {
    await TimestampModel.create({
      category: "BAZAAR_LAST_UPDATE",
      lastTime: Date.now(),
    });
  }
}

async function auctionUpdater(hypixelApi: HypixelAPI) {
  const auctionsLastUpdate = await TimestampModel.findOne({
    category: "AUCTIONS_LAST_UPDATE",
  });
  if (
    !auctionsLastUpdate ||
    auctionsLastUpdate?.lastTime + 6 * 60 * 60e3 <= Date.now()
  ) {
    logger.info(`AUCTIONS`, `Started auction items scraping.`);
    await updateAuctionItemPrices(await getAllAuctionItems(hypixelApi));
    logger.info(`AUCTIONS`, `Auction items updated!`);
  }

  if (auctionsLastUpdate?.lastTime + 6 * 60 * 60e3 <= Date.now()) {
    auctionsLastUpdate.lastTime = Date.now();
    await auctionsLastUpdate.save();
  } else if (!auctionsLastUpdate) {
    await TimestampModel.create({
      category: "AUCTIONS_LAST_UPDATE",
      lastTime: Date.now(),
    });
  }
}
