import { MessageEmbed } from "discord.js";

export default class embeds {
  static error = function (error: string, title = "Error Caught") {
    const embed = new MessageEmbed()
      .setTitle(title)
      .setDescription(error)
      .setColor("RED")
      .setTimestamp();
    return embed;
  };

  static normal = function (title: string, description: string) {
    const embed = new MessageEmbed()
      .setTitle(title)
      .setDescription(description)
      .setColor("GREEN")
      .setTimestamp();
    return embed;
  };

  static loading = function () {
    const embed = new MessageEmbed()
      .setTitle(`Query Processing`)
      .setDescription(`The information is currently loading.`)
      .setColor("GREEN")
      .setTimestamp();
    return embed;
  };

  static empty = function () {
    const embed = new MessageEmbed().setColor("GREEN").setTimestamp();
    return embed;
  };
}
