import chalk from "chalk";
import fetch from "node-fetch";
import {
  ISkyblockProfilesResponse,
  IGuildResponse,
  IMojangProfileResponse,
  IPlayerActivity,
  IAuctionResponse,
  IBazaarResponse,
  IPlayerDataResponse,
} from "./interfaces";

export class HypixelAPI {
  constructor(private apiKey: string) {}

  keyThrottled: boolean;
  throttleTime: Date;

  lastRequest: Date;
  requestsInMinute: number;

  async getAuctionPage(pageNumber = 0, apiKey = this.apiKey) {
    if (!this.checkCounters()) return;

    const request = await fetch(
      `http://api.hypixel.net/skyblock/auctions?${apiKey}&page=${pageNumber}`
    );
    if (request.status === 429) {
      this.throttleTime = new Date();
      this.keyThrottled = true;
    }
    if (!request.ok) return;

    const response = (await request.json()) as IAuctionResponse;
    if (response?.auctions?.length) {
      return response;
    }
  }

  async getBazaarItems(apiKey = this.apiKey) {
    if (!this.checkCounters()) return;

    const request = await fetch(
      `http://api.hypixel.net/skyblock/bazaar?key=${apiKey}`
    );
    if (request.status === 429) {
      this.throttleTime = new Date();
      this.keyThrottled = true;
    }
    if (!request.ok) return;

    const response = (await request.json()) as IBazaarResponse;
    if (response.success) {
      return Object.values(response.products);
    }
  }

  async getGuild(guildId: string, apiKey = this.apiKey) {
    if (!this.checkCounters()) return;

    const request = await fetch(
      `http://api.hypixel.net/guild?id=${guildId}&key=${apiKey}`
    );
    if (request.status === 429) {
      this.throttleTime = new Date();
      this.keyThrottled = true;
    }
    if (!request.ok) return;

    const response = (await request.json()) as IGuildResponse;
    if (response.success && response.guild) {
      return response.guild;
    }
  }

  async getPlayerActivity(playerUuid: string, apiKey = this.apiKey) {
    if (!this.checkCounters()) return;

    const request = await fetch(
      `http://api.hypixel.net/status?uuid=${playerUuid}&key=${apiKey}`
    );
    if (request.status === 429) {
      this.throttleTime = new Date();
      this.keyThrottled = true;
    }
    if (!request.ok) return;

    const response = (await request.json()) as IPlayerActivity;
    if (response.success && response.session) {
      return response;
    }
  }

  async getSkyblockInformation(playerUuid: string, apiKey = this.apiKey) {
    if (!this.checkCounters()) return;

    const request = await fetch(
      `http://api.hypixel.net/skyblock/profiles?key=${apiKey}&uuid=${playerUuid}`
    );
    if (request.status === 429) {
      this.throttleTime = new Date();
      this.keyThrottled = true;
    }
    if (!request.ok) return;

    const response = (await request.json()) as ISkyblockProfilesResponse;
    if (response) return response;
  }

  async getHypixelPlayer(playerUuid: string, apiKey = this.apiKey) {
    if (!this.checkCounters()) return;

    const request = await fetch(
      `http://api.hypixel.net/player?key=${apiKey}&uuid=${playerUuid}`
    );
    if (request.status === 429) {
      this.throttleTime = new Date();
      this.keyThrottled = true;
    }
    if (!request.ok) return;

    const response = (await request.json()) as IPlayerDataResponse;
    if (response?.player) return response.player;
  }

  async playerUuidToUsername(playerUuid: string) {
    const request = await fetch(
      `http://api.mojang.com/user/profiles/${playerUuid}/names`
    );
    if (!request.ok) return;

    const response = await request.json();
    if (response.length) {
      return response[response.length - 1].name;
    }
  }

  async getMojangProfile(playerName: string) {
    const request = await fetch(
      `http://api.mojang.com/users/profiles/minecraft/${playerName}`
    );
    if (request.status !== 200) return;

    const response = (await request.json()) as IMojangProfileResponse;
    if (response) return response;
  }

  checkCounters() {
    const requestLimitPerMinute = 120;
    if (!this.keyThrottled && !this.throttleTime) {
      if (!this.lastRequest || !this.requestsInMinute) {
        // There is no last request neither any requests at all
        this.lastRequest = new Date();
        this.requestsInMinute = 1;
      } else if (new Date().getTime() - this.lastRequest.getTime() > 90e3) {
        // The last request was made 90+ seconds ago
        console.log(chalk.red(`Case 1 - API Fail`));
        this.lastRequest = new Date();
        this.requestsInMinute = 1;
      } else if (new Date().getTime() - this.lastRequest.getTime() <= 90e3) {
        if (this.requestsInMinute < requestLimitPerMinute) {
          // The last request was made in the past 90 seconds and there's less than the max requests
          this.lastRequest = new Date();
          this.requestsInMinute += 1;
        } else if (this.requestsInMinute >= requestLimitPerMinute) {
          // The last request was made in the past 90 seconds and there's less than the max requests
          console.log(chalk.red(`Case 2 - API Fail`));
          return false;
        } else {
          console.log(chalk.red(`Case 1 - API Success/Fail`));
        }
      } else {
        console.log(chalk.red(`Case 2 - API Success/Fail`));
      }
    } else if (new Date().getTime() - this.throttleTime.getTime() < 90e3) {
      console.log(chalk.red(`Case 3 - API Fail`));
      return false;
    } else {
      console.log(chalk.red(`Case 4 - API Fail`));
      this.keyThrottled = null;
      this.throttleTime = null;
    }
    return true;
  }
}
