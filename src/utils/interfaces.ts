import { BAZAAR_ITEM_IDS } from "../data";

export interface IPlayerActivity {
  success: boolean;
  uuid: string;
  session: {
    online: boolean;
    gameType: string;
    mode: string;
  };
}

export interface IPlayerDataResponse {
  success: true;
  player: {
    _id: string;
    uuid: string;
    firstLogin: number;
    playername: string;
    lastLogin: number;
    displayname: string;
    knownAliases: string[];
    knownAliasesLower: string[];
    achievementsOneTime: string[];
    network_update_book: string;
    lastLogout: number;
    quickjoin_timestamp: number;
    quickjoin_uses: number;
    achievementPoints: number;
    newPackageRank: string;
    monthlyPackageRank?: string;
  };
}

export interface IGuildResponse {
  success: number;
  guild: {
    _id: string;
    name: string;
    name_lower: string;
    coins: number;
    coinsEver: number;
    created: number;
    members: IGuildMember[];
    ranks: IGuildRole[];
    achievements: Record<string, number>;
    exp: number;
    guildExpByGameType: {
      DUELS: number;
      WALLS3: number;
      QUAKECRAFT: number;
      GINGERBREAD: number;
      REPLAY: number;
      ARCADE: number;
      BEDWARS: number;
      BATTLEGROUND: number;
      SKYWARS: number;
      SUPER_SMASH: number;
      SURVIVAL_GAMES: number;
      PIT: number;
      LEGACY: number;
      PAINTBALL: number;
      MURDER_MYSTERY: number;
      PROTOTYPE: number;
      SPEED_UHC: number;
      VAMPIREZ: number;
      HOUSING: number;
      BUILD_BATTLE: number;
      UHC: number;
      TNTGAMES: number;
      SKYBLOCK: number;
      WALLS: number;
      MCGO: number;
      ARENA: number;
    };
  };
}

export interface IGuildMember {
  uuid: string;
  rank: string;
  joined: number;
  questParticipation: number;
  expHistory: Record<string, number>;
}

export interface IGuildRole {
  name: string;
  default: boolean;
  priority: number;
  created: number;
}

type TCuteNames =
  | "Apple"
  | "Banana"
  | "Blueberry"
  | "Coconut"
  | "Cucumber"
  | "Grapes"
  | "Kiwi"
  | "Lemon"
  | "Lime"
  | "Mango"
  | "Orange"
  | "Papaya"
  | "Peach"
  | "Pear"
  | "Pineapple"
  | "Pomegranate"
  | "Raspberry"
  | "Strawberry"
  | "Tomato"
  | "Watermelon"
  | "Zucchini";

type TObjectives = {
  [x: string]: {
    [x: string]: string | number;
  };
};

type TQuests = {
  [x: string]: IQuest;
};

type TBestDungeonRun = {
  [x: string]: IBestDungeonRun[];
};

type TCollections = {
  [x: string]: number;
};

type TProfileMembers = {
  [x: string]: IProfileMember;
};

type TJacobContest = {
  [x: string]: IJacobContestData;
};

type TNbtStorage = {
  type: number;
  data: string;
};

type TDungeonSpecificStats = {
  [x: string]: number;
};

type TSacksCount = {
  [x: string]: number;
};

type TExpirementResults = {
  [x: string]: number;
};

export interface ISkyblockProfilesResponse {
  success: boolean;
  profiles: Profile[];
}

export interface IMojangProfileResponse {
  name: string;
  id: string;
}

export interface IAuctionResponse {
  success: boolean;
  page: number;
  totalPages: number;
  totalAuctions: number;
  lastUpdated: number;
  auctions: IAuctionItem[];
}

export interface IAuctionItem {
  _id: string;
  uuid: string;
  auctioneer: string;
  profile_id: string;
  coop: string[];
  start: number;
  end: number;
  item_name: string;
  item_lore: string;
  extra: string;
  category: string;
  tier: string;
  starting_bid: number;
  item_bytes: string;
  itemData?: IItem;
  claimed: boolean;
  claimed_bidders?: any;
  highest_bid_amount: number;
  bin?: boolean;
  bids: {
    auction_id: string;
    bidder: string;
    profile_id: string;
    amount: number;
    timestamp: number;
  }[];
}

export interface Profile {
  profile_id: string;
  members: TProfileMembers;
  community_upgrades: {
    currently_upgrading: {
      upgrade: string;
      new_tier: number;
      start_ms: number;
      who_started: string;
    };
    upgrade_states: CommunityUpgradeState[];
  };
  cute_name: TCuteNames;
  banking: {
    balance: number;
    transactions: BankTransaction[];
  };
}

export interface IProfileMember {
  last_save: number;
  first_join: number;
  first_join_hub: number;
  stats: Record<string, number>;
  objectives: TObjectives;
  tutorial: string[];
  quests: TQuests;
  coin_purse: number;
  last_death: number;
  crafted_generators: string[];
  visited_zones: string[];
  fairy_souls_collected: number;
  fairy_souls: number;
  fairy_exchanges: number;
  fishing_treasure_caught: number;
  death_count: number;
  achievement_spawned_island_types: string[];
  slayer_quest: ICurrentSlayerQuest;
  slayer_bosses: ISlayerBosses;
  pets: IPet[];
  dungeons: IDungeons;
  griffin: any;
  jacob2: IJacob;
  experimentation: IExpirementation;
  unlocked_coll_tiers: string[];
  collection: TCollections;
  wardrobe_equipped_slot: number;
  inv_armor: TNbtStorage;
  fishing_bag: TNbtStorage;
  quiver: TNbtStorage;
  ender_chest_contents: TNbtStorage;
  wardrobe_contents: TNbtStorage;
  potion_bag: TNbtStorage;
  personal_vault_contents: TNbtStorage;
  inv_contents: TNbtStorage;
  talisman_bag: TNbtStorage;
  candy_inventory_contents: TNbtStorage;
  experience_skill_runecrafting: number;
  experience_skill_combat: number;
  experience_skill_mining: number;
  experience_skill_alchemy: number;
  experience_skill_farming: number;
  experience_skill_taming: number;
  experience_skill_enchanting: number;
  sacks_counts: TSacksCount;
  experience_skill_fishing: number;
  experience_skill_foraging: number;
  experience_skill_carpentry: number;
}

interface IPet {
  uuid: string;
  type: string;
  exp: number;
  active: boolean;
  tier: string;
  heldItem: string;
  candyUsed: number;
  skin: string | any;
}

interface IJacobContestData {
  collected: number;
  claimed_rewards?: boolean;
  claimed_position?: number;
  claimed_participants?: number;
}

interface BankTransaction {
  amount: number;
  timestamp: number;
  action: "DEPOSIT" | "WITHDRAW";
  initiator_name: string;
}

interface CommunityUpgradeState {
  upgrade: string;
  tier: number;
  started_ms: number;
  started_by: string;
  claimed_ms: number;
  claimed_by: string;
  fasttracked: boolean;
}

interface IQuest {
  status: string;
  activated_at: number;
  activated_at_sb: number;
  completed_at: number;
  completed_at_sb: number;
}

interface IBestDungeonRun {
  timestamp: number;
  score_exploration: number;
  score_speed: number;
  score_skill: number;
  score_bonus: number;
  dungeon_class: string;
  teammates: string[];
  elapsed_time: number;
  damage_dealt: number;
  deaths: number;
  mobs_killed: number;
  secrets_found: number;
  damage_mitigated: number;
  ally_healing: number;
}

interface IDungeonPlayerClass {
  healer: {
    experience: number;
  };
  mage: {
    experience: number;
  };
  berserk: {
    experience: number;
  };
  archer: {
    experience: number;
  };
  tank: {
    experience: number;
  };
}

interface IDungeonJournals {
  journal_entries: {
    karylles_diary: number[];
    the_study: number[];
    expedition_volume_1: number[];
    uncanny_remains: number[];
    aftermath: number[];
    expedition_volume_2: number[];
    the_walls: number[];
    expedition_volume_3: number[];
    expedition_volume_4: number[];
    grim_adversity: number[];
    necrons_magic_scroll: number[];
  };
}

interface ICurrentSlayerQuest {
  type: string;
  tier: number;
  start_timestamp: number;
  completion_state: number;
  combat_xp: number;
  recent_mob_kills: [
    {
      xp: number;
      timestamp: number;
    },
    {
      xp: number;
      timestamp: number;
    },
    {
      xp: number;
      timestamp: number;
    }
  ];
  last_killed_mob_island: string;
}

interface ISlayerBosses {
  zombie: {
    claimed_levels: {
      level_5: boolean;
      level_4: boolean;
      level_3: boolean;
      level_2: boolean;
      level_1: boolean;
    };
    boss_kills_tier_0: number;
    xp: number;
    boss_kills_tier_1: number;
    boss_kills_tier_2: number;
    boss_kills_tier_3: number;
  };
  spider: {
    claimed_levels: {
      level_2: boolean;
      level_1: boolean;
      level_5: boolean;
      level_6: boolean;
    };
    boss_kills_tier_0: number;
    xp: number;
    boss_kills_tier_1: number;
    boss_kills_tier_2: number;
    boss_kills_tier_3: number;
  };
  wolf: {
    claimed_levels: {
      level_1: boolean;
      level_2: boolean;
      level_3: boolean;
      level_4: boolean;
    };
    boss_kills_tier_0: number;
    xp: number;
    boss_kills_tier_1: number;
    boss_kills_tier_2: number;
    boss_kills_tier_3: number;
  };
}

interface IDungeons {
  dungeon_types: {
    catacombs: {
      times_played: TDungeonSpecificStats;
      watcher_kills: TDungeonSpecificStats;
      experience: number;
      tier_completions: TDungeonSpecificStats;
      highest_tier_completed: number;
      fastest_time: TDungeonSpecificStats;
      best_runs: TBestDungeonRun;
      best_score: TDungeonSpecificStats;
      mobs_killed: TDungeonSpecificStats;
      most_mobs_killed: TDungeonSpecificStats;
      most_damage_archer: TDungeonSpecificStats;
      most_healing: TDungeonSpecificStats;
      most_damage_tank: TDungeonSpecificStats;
      most_damage_berserk: TDungeonSpecificStats;
      most_damage_mage: TDungeonSpecificStats;
      fastest_time_s: TDungeonSpecificStats;
      most_damage_healer: TDungeonSpecificStats;
      fastest_time_s_plus: TDungeonSpecificStats;
    };
  };
  player_classes: IDungeonPlayerClass;
  dungeon_journal: IDungeonJournals;
  selected_dungeon_class: string;
  dungeons_blah_blah: string[];
}

interface IJacob {
  medals_inv: {
    bronze: number;
    silver: number;
    gold: number;
  };
  perks: {
    double_drops: number;
  };
  contests: TJacobContest;
  talked: boolean;
  unique_golds2: string[];
}

interface IExpirementation {
  pairings: TExpirementResults;
  simon: TExpirementResults;
  numbers: TExpirementResults;
  claims_resets: number;
  claims_resets_timestamp: number;
}

export interface NBTData {
  id: number;
  Count: number;
  tag: {
    ench?: any;
    Unbreakable?: number;
    HideFlags: number;
    SkullOwner?: any;
    display: {
      Lore: string[];
      Name: string;
    };
    ExtraAttributes: {
      originTag?: string;
      id?: string;
      uuid?: string;
      timestamp?: string;
      modifier?: string;
      enchantments?: {
        [x: string]: number;
      };
      anvil_uses?: number;
      rarity_upgrades?: number;
      hot_potato_count?: number;
      dungeon_item_level?: number;
      ability_scroll?: string[];
      backpack_color?: string;
      color?: string;

      small_backpack_data?: number[];
      medium_backpack_data?: number[];
      large_backpack_data?: number[];
      greater_backpack_data?: number[];
      jumbo_backpack_data?: number[];
    };
  };
  Damage: number;
}

export type TBazaarItemIds = typeof BAZAAR_ITEM_IDS[number];

export interface IBazaarResponse {
  success: boolean;
  lastUpdated: number;
  products: Record<TBazaarItemIds, IBazaarProduct>;
}

export interface IBazaarProduct {
  product_id: TBazaarItemIds;
  sell_summary: { amount: number; pricePerUnit: number; orders: number }[];
  buy_summary: { amount: number; pricePerUnit: number; orders: number }[];
  quick_status: {
    productId: TBazaarItemIds;
    sellPrice: number;
    sellVolume: number;
    sellMovingWeek: number;
    sellOrders: number;
    buyPrice: number;
    buyVolume: number;
    buyMovingWeek: number;
    buyOrders: number;
  };
}

export type something = Record<string, string>;

export interface IItem {
  id: string;
  displayName: string;
  lore: string[];
  color?: string;
  amount: number;
  worth?: number;
  recombobulated: boolean;
  hotPotatoCount: number;
  enchantments: { enchantName: string; enchantLevel: number }[];
  backpackItems?: IItem[];
}
