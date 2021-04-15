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
import { Archived, ArchivedModel } from "../models/archived";
import { AccountModel } from "../models/account";

dotenv();

export default class Started extends Event {
  eventName: EventNameType = "ready";

  async handle() {
    logger.info("BOT", "The bot has started!");

    await bazaarUpdater(this.client.hypixel);
    await auctionUpdater(this.client.hypixel);
    setInterval(async () => {
      await auctionUpdater(this.client.hypixel);
      await bazaarUpdater(this.client.hypixel);
    }, 60 * 60e3);

    setInterval(async () => {
      await accountArchiver();
    }, 10 * 60e3);

    if (process.env.NODE_ENV === "production") {
      for (let i = 0; i < 5; i++) {
        new Scraper(
          accounts[i].email,
          accounts[i].password,
          accounts[i].apiKey
        );
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
    const outdatedAccounts = await AccountModel.find({
      createdAt: { $lte: new Date(Date.now() - 30 * 60e3) },
    });
    await AccountModel.deleteMany({
      _id: { $in: outdatedAccounts.map((x) => x._id) },
    });

    for (const outdatedAccount of outdatedAccounts) {
      await ArchivedModel.create({
        username: outdatedAccount.username,
        itemName: outdatedAccount.itemName,
      });
    }
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
    logger.info(`AUCTIONS`, `Bazaar items updated!`);
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
