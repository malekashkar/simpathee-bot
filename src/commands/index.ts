import { Message } from "discord.js";
import Client from "..";

export default abstract class Command {
  aliases?: string[] = [];
  disabled = false;
  usage = "";

  rolePermissions: string[] = [];

  client: Client;

  abstract cmdName: string;
  abstract description: string;

  constructor(client: Client) {
    this.client = client;
  }

  abstract run(_message: Message, _args: string[]): Promise<Message | void>;
}
