import { Message } from "discord.js";
import Command from ".";
import { commafyNumber, minifyNumber } from "../utils";
import embeds from "../utils/embeds";
import { checkItemPrice, parseInventoryData } from "../utils/hypixel";
import {
  getBazaarItemPrice,
  getMojangProfile,
  getSkyblockProfile,
} from "../utils/hypixelApi";
import { IItem } from "../utils/interfaces";

export default class NetworthCommand extends Command {
  cmdName = "networth";
  description = "Check a Hypixel Skyblock player's networth.";
  aliases = ["n", "nw"];

  async run(message: Message, args: string[]) {
    const username = args[0];
    if (!username)
      return message.channel.send(
        embeds.error(`Please provide a player username!`)
      );

    const mojangProfile = await getMojangProfile(username);
    if (!mojangProfile)
      return message.channel.send(
        embeds.error(`The username doesn't seem to be a valid MC username.`)
      );

    const skyblockProfiles = await getSkyblockProfile(mojangProfile.id);
    if (!skyblockProfiles)
      return message.channel.send(
        embeds.error(
          `Error finding any skyblock profiles for **${mojangProfile.name}**.`
        )
      );

    const loadingEmbed = await message.channel.send(embeds.loading());
    const latestProfile = skyblockProfiles.sort((profilea, profileb) => {
      if (
        profilea.members[mojangProfile.id].last_save >
        profileb.members[mojangProfile.id].last_save
      )
        return -1;
      else return 1;
    })[0];
    const memberProfile = latestProfile.members[mojangProfile.id];

    console.log(memberProfile);

    const inventoryContent = await parseInventoryData(
      memberProfile.inv_contents.data
    );
    const inventoryWorth = (
      await Promise.all(inventoryContent.map(checkItemPrice))
    ).reduce((a, b) => a + b.worth, 0);

    const enderchestContent = await parseInventoryData(
      memberProfile.ender_chest_contents.data
    );
    const enderchestWorth = enderchestContent.reduce((a, b) => a + b.worth, 0);

    const wardrobeContent = await parseInventoryData(
      memberProfile.wardrobe_contents.data
    );
    const wardrobeWorth = wardrobeContent.reduce((a, b) => a + b.worth, 0);

    const talismanContent = await parseInventoryData(
      memberProfile.wardrobe_contents.data
    );
    const talismanWorth = talismanContent.reduce((a, b) => a + b.worth, 0);

    const armorContent = await parseInventoryData(memberProfile.inv_armor.data);
    const armorWorth = armorContent.reduce((a, b) => a + b.worth, 0);

    const petContent = await parseInventoryData(memberProfile.inv_armor.data);
    const petWorth = petContent.reduce((a, b) => a + b.worth, 0);

    const totalNetworth =
      enderchestWorth +
        inventoryWorth +
        armorWorth +
        wardrobeWorth +
        petWorth +
        talismanWorth +
        memberProfile.coin_purse +
        latestProfile.banking?.balance || 0;

    const commafiedTotalNetworth = commafyNumber(totalNetworth);
    const minifiedTotalnetworth = minifyNumber(totalNetworth);
    const purseCoins = minifyNumber(memberProfile.coin_purse);
    const bankCoins =
      latestProfile.banking?.balance === 0
        ? `0 Coins`
        : latestProfile.banking?.balance
        ? `${minifyNumber(latestProfile.banking.balance)}`
        : `<Private>`;
    const irlNetworth = await realLifeNetworth(totalNetworth);
    await loadingEmbed.edit(
      embeds
        .empty()
        .setTitle(mojangProfile.name)
        .setURL(`https://sky.shiiyu.moe/${mojangProfile.name}`)
        .setDescription(
          `**${mojangProfile.name}**'s total networth is **$${commafiedTotalNetworth}** (**${minifiedTotalnetworth}**)`
        )
        .setThumbnail(`https://cravatar.eu/helmhead/${mojangProfile.id}`)
        .addFields([
          {
            name: `Purse`,
            value: `${purseCoins} Coins`,
            inline: true,
          },
          {
            name: `Bank`,
            value: bankCoins,
            inline: true,
          },
          {
            name: `IRL Networth`,
            value: `$${irlNetworth}`,
            inline: true,
          },
          {
            name: `Enderchest Value (${minifyNumber(enderchestWorth)})`,
            value: formatTop5Items(enderchestContent),
            inline: false,
          },
          {
            name: `Inventory Value (${minifyNumber(inventoryWorth)})`,
            value: formatTop5Items(inventoryContent),
            inline: false,
          },
          {
            name: `Armor's Value (${minifyNumber(armorWorth)})`,
            value: formatTop5Items(armorContent),
            inline: false,
          },
          {
            name: `Wardrobe Value (${minifyNumber(wardrobeWorth)})`,
            value: formatTop5Items(wardrobeContent),
            inline: false,
          },
          {
            name: `Pet's Value (${minifyNumber(petWorth)})`,
            value: formatTop5Items(petContent),
            inline: false,
          },
          {
            name: `Talisman's Value (${minifyNumber(talismanWorth)})`,
            value: formatTop5Items(talismanContent),
            inline: false,
          },
        ])
    );
  }
}

function formatTop5Items(allItems: IItem[]) {
  const expensiveToCheap = allItems
    .filter((item) => item.displayName && item.worth)
    .sort((itemA, itemB) => {
      if (itemA.worth > itemB.worth) return -1;
      else return 1;
    });
  const firstFiveItems = expensiveToCheap.slice(0, 4);
  const mappedItems = firstFiveItems
    .map((item) => {
      const itemName = item.recombobulated
        ? `${item.displayName} <:Recombobulator_3000:827030310527959051>`
        : item.displayName;
      const itemPrice = minifyNumber(item.worth);
      return `${itemName} → ${itemPrice}`;
    })
    .join("\n");
  return mappedItems || `No items found!`;
}

async function realLifeNetworth(num: number) {
  const currentBoosterCookieIngamePrice = await getBazaarItemPrice(
    "BOOSTER_COOKIE"
  );
  const boosterCookieIrlPrice = 2.75;
  const irlPricePerMil = Number(
    (
      boosterCookieIrlPrice /
      (currentBoosterCookieIngamePrice / 1000000)
    ).toFixed(2)
  );
  return Number((irlPricePerMil * (num / 1000000)).toFixed(2));
}
