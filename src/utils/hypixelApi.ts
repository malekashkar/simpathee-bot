import fetch from "node-fetch";
import { config as dotenv } from "dotenv";
import {
  ISkyblockProfilesResponse,
  IGuildResponse,
  IMojangProfileResponse,
  IPlayerActivity,
  IAuctionResponse,
  IBazaarResponse,
  TBazaarItemIds,
  IPlayerDataResponse,
} from "./interfaces";
import { accounts } from "../config";

dotenv();

const auctionApiKey = process.env.AUCTION_API_KEY;

export async function getAuctionPage(auctionPage = 0) {
  const request = await fetch(
    `https://api.hypixel.net/skyblock/auctions?${auctionApiKey}&page=${auctionPage}`
  );
  if (!request.ok) return;

  const response = (await request.json()) as IAuctionResponse;
  if (response?.auctions?.length) {
    return response;
  }
}

export async function getBazaarItemPrice(
  bazaarItem: TBazaarItemIds,
  apiKey?: string
) {
  if (!apiKey)
    apiKey = accounts[Math.floor(Math.random() * accounts.length)].apiKey;
  const request = await fetch(
    `https://api.hypixel.net/skyblock/bazaar?key=${apiKey}`
  );
  if (!request.ok) return;

  const response = (await request.json()) as IBazaarResponse;
  if (response.success) {
    return response.products[bazaarItem]?.quick_status?.sellPrice || 0;
  }
}

export async function getGuild(guildId: string, apiKey?: string) {
  if (!apiKey)
    apiKey = accounts[Math.floor(Math.random() * accounts.length)].apiKey;
  const request = await fetch(
    `https://api.hypixel.net/guild?id=${guildId}&key=${apiKey}`
  );
  if (!request.ok) return;

  const response = (await request.json()) as IGuildResponse;
  if (response.success && response.guild) {
    return response.guild;
  }
}

export async function getPlayerActivity(playerUuid: string, apiKey?: string) {
  if (!apiKey)
    apiKey = accounts[Math.floor(Math.random() * accounts.length)].apiKey;
  const request = await fetch(
    `https://api.hypixel.net/status?uuid=${playerUuid}&key=${apiKey}`
  );
  if (!request.ok) return;

  const response = (await request.json()) as IPlayerActivity;
  if (response.success && response.session) {
    return response;
  }
}

export async function getSkyblockProfile(playerUuid: string, apiKey?: string) {
  if (!apiKey)
    apiKey = accounts[Math.floor(Math.random() * accounts.length)].apiKey;
  const request = await fetch(
    `https://api.hypixel.net/skyblock/profiles?key=${apiKey}&uuid=${playerUuid}`
  );
  if (!request.ok) return;

  const response = (await request.json()) as ISkyblockProfilesResponse;
  if (response) return response.profiles;
}

export async function getHypixelPlayer(playerUuid: string, apiKey?: string) {
  if (!apiKey)
    apiKey = accounts[Math.floor(Math.random() * accounts.length)].apiKey;
  const request = await fetch(
    `https://api.hypixel.net/player?key=${apiKey}&uuid=${playerUuid}`
  );
  if (!request.ok) return;

  const response = (await request.json()) as IPlayerDataResponse;
  if (response?.player) return response.player;
}

export async function uuidToUsername(playerUuid: string) {
  const request = await fetch(
    `https://api.mojang.com/user/profiles/${playerUuid}/names`
  );
  if (!request.ok) return;

  const response = await request.json();
  if (response.length) {
    return response[response.length - 1].name;
  }
}

export async function getMojangProfile(playerName: string) {
  const request = await fetch(
    `https://api.mojang.com/users/profiles/minecraft/${playerName}`
  );
  if (request.status !== 200) return;

  const response = (await request.json()) as IMojangProfileResponse;
  if (response) return response;
}
