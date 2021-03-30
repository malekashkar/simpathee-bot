import fetch from "node-fetch";
import { config as dotenv } from "dotenv";
import { IGuildResponse, IPlayerActivity } from "./interfaces";

dotenv();

const API_KEY = process.env.HYPIXEL_API_KEY;

export async function getGuild(guildId: string) {
  const request = await fetch(
    `https://api.hypixel.net/guild?id=${guildId}&key=${API_KEY}`
  );
  if (!request.ok) return;

  const response = (await request.json()) as IGuildResponse;
  if (response.success && response.guild) {
    return response.guild;
  }
}

export async function getPlayerActivity(playerUuid: string) {
  const request = await fetch(
    `https://api.hypixel.net/status?uuid=${playerUuid}&key=${API_KEY}`
  );
  if (!request.ok) return;

  const response = (await request.json()) as IPlayerActivity;
  if (response.success && response.session) {
    return response;
  }
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
