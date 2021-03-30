import { ClientEvents } from "discord.js";

import Client from "..";

export type EventNameType = keyof ClientEvents;

export default abstract class Event {
  client: Client;
  disabled = false;
  
  constructor(client: Client) {
    this.client = client;
  }
  
  abstract eventName: EventNameType;
  abstract handle(...args: unknown[]): Promise<void>;
}
