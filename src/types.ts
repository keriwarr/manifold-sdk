interface GenericCreateMarketArgs {
  // The headline question for the market.
  question: string;
  // A long description describing the rules for the market.
  description?: string;
  descriptionMarkdown?: string;
  descriptionHtml?: string;
  // The time at which the market will close, represented as milliseconds since the epoch.
  closeTime?: number;
  // An array of string tags for the market.
  tags?: string[];
  visibility?: "public" | "unlisted";
  groupId?: string;
}

interface BinaryCreateMarketArgs extends GenericCreateMarketArgs {
  outcomeType: "BINARY";
  // between 1 and 99 inclusive
  initialProb: number;
}

interface FreeResponseCreateMarketArgs extends GenericCreateMarketArgs {
  outcomeType: "FREE_RESPONSE";
}

interface PseudoNumericCreateMarketArgs extends GenericCreateMarketArgs {
  outcomeType: "PSEUDO_NUMERIC";
  // The minimum value that the market may resolve to.
  min: number;
  // The maximum value that the market may resolve to.
  max: number;
  isLogScale: boolean;
  initialValue: number;
}

interface MultipleChoiceCreateMarketArgs extends GenericCreateMarketArgs {
  outcomeType: "MULTIPLE_CHOICE";
  answers: string[];
}

export type CreateMarketArgs =
  | BinaryCreateMarketArgs
  | FreeResponseCreateMarketArgs
  | PseudoNumericCreateMarketArgs
  | MultipleChoiceCreateMarketArgs;

// TODO: get build to output comments?
export interface User {
  id: string; // user's unique id
  createdTime: number;

  name: string; // display name, may contain spaces
  username: string; // username, used in urls
  // keri: wasn't present in dev. making partial
  url?: string; // link to user's profile
  avatarUrl?: string;

  bio?: string;
  bannerUrl?: string;
  website?: string;
  twitterHandle?: string;
  discordHandle?: string;

  // Note: the following are here for convenience only and may be removed in the future.
  balance: number;
  totalDeposits: number;
  // keri: wasn't present in dev. making partial
  totalPnLCached?: number;

  // maybe guaranteed? no idea
  creatorVolumeCached?: {
    allTime: number;
    weekly: number;
    daily: number;
    monthly: number;
  };
  profitCached?: {
    allTime: number;
    weekly: number;
    daily: number;
    monthly: number;
  };

  // only for /me
  followedCategories?: string[];
  followerCountCached?: number;
}

export interface Bet extends Partial<LimitProps> {
  id: string;
  userId: string;
  contractId: string;
  createdTime: number;

  amount: number; // bet size; negative if SELL bet
  loanAmount?: number;
  outcome: string;
  shares: number; // dynamic parimutuel pool weight or fixed ; negative if SELL bet

  probBefore: number;
  probAfter: number;

  sale?: {
    amount: number; // amount user makes from sale
    betId: string; // id of bet being sold
    // TODO: add sale time?
  };

  fees?: {
    liquidityFee: number;
    creatorFee: number;
    platformFee: number;
  };

  isSold?: boolean; // true if this BUY bet has been sold
  isAnte?: boolean;
  isLiquidityProvision?: boolean;
  isRedemption?: boolean;
}

export type NumericBet = Bet & {
  value: number;
  allOutcomeShares: { [outcome: string]: number };
  allBetAmounts: { [outcome: string]: number };
};

// Binary market limit order.
export type LimitBet = Bet & LimitProps;

interface LimitProps {
  orderAmount: number; // Amount of limit order.
  limitProb: number; // [0, 1]. Bet to this probability.
  isFilled: boolean; // Whether all of the bet amount has been filled.
  isCancelled: boolean; // Whether to prevent any further fills.
  // A record of each transaction that partially (or fully) fills the orderAmount.
  // I.e. A limit order could be filled by partially matching with several bets.
  // Non-limit orders can also be filled by matching with multiple limit orders.
  fills: fill[];
}

export type fill = {
  // The id the bet matched against, or null if the bet was matched by the pool.
  matchedBetId: string | null;
  amount: number;
  shares: number;
  timestamp: number;
  // If the fill is a sale, it means the matching bet has shares of the same outcome.
  // I.e. -fill.shares === matchedBet.shares
  isSale?: boolean;
};

export interface Comment {
  userName: string;
  userUsername: string;
  id: string;
  userAvatarUrl: string;
  text: string;
  createdTime: number;
  userId: string;
  contractId: string;
}

export interface Answer {
  createdTime: number;
  avatarUrl: string;
  id: string;
  username: string;
  number: number;
  name: string;
  contractId: string;
  text: string;
  userId: string;
  probability: number;
}

export interface FullMarket extends LiteMarket {
  // bets and comments removed!
  // bets: Bet[];
  // comments: Comment[];

  answers?: Answer[]; // dpm-2 markets only
  description: unknown; // Rich text content. See https://tiptap.dev/guide/output#option-1-json
  textDescription: string; // string description without formatting, images, or embeds
}
export interface LiteMarket {
  // Unique identifier for this market
  id: string;

  // Attributes about the creator
  creatorUsername: string;
  creatorName: string;
  createdTime: number; // milliseconds since epoch
  creatorAvatarUrl?: string;

  // Market attributes. All times are in milliseconds since epoch
  closeTime?: number; // Min of creator's chosen date, and resolutionTime
  question: string;
  description: unknown; // FIXME: ...

  // A list of tags on each market. Any user can add tags to any market.
  // This list also includes the predefined categories shown as filters on the home page.
  tags: string[];

  // Note: This url always points to https://manifold.markets, regardless of what instance the api is running on.
  // This url includes the creator's username, but this doesn't need to be correct when constructing valid URLs.
  //   i.e. https://manifold.markets/Austin/test-market is the same as https://manifold.markets/foo/test-market
  url: string;

  outcomeType: CreateMarketArgs["outcomeType"]; // BINARY, FREE_RESPONSE, or NUMERIC
  mechanism: "dpm-2" | "cpmm-1";

  probability: number;
  // keri: might be nice to discriminate the type by outcomeType. e.g. the only outcomes in the pool are "YES" and "NO" for binary
  pool: Record<string, number>; // For CPMM markets, the number of shares in the liquidity pool. For DPM markets, the amount of mana invested in each answer.
  p?: number; // CPMM markets only, probability constant in y^p * n^(1-p) = k
  totalLiquidity?: number; // CPMM markets only, the amount of mana deposited into the liquidity pool

  volume: number;
  volume7Days: number;
  volume24Hours: number;

  isResolved: boolean;
  resolutionTime?: number;
  resolution?: string;
  resolutionProbability?: number; // Used for BINARY markets resolved to MKT
}

export interface CreateMarketResponse
  extends Omit<LiteMarket, "url" | "probability"> {
  slug: string; // keri: don't know for sure this is guaranteed to be present but I sure hope it is...

  creatorId?: string;

  lowercaseTags?: string[];

  initialProbability?: number;

  visibility?: string;
  collectedFees?: {
    creatorFee: number;
    liquidityFee: number;
    platformFee: number;
  };
}

export interface Group {
  id: string;
  name: string;
  about?: string;
  createdTime: number;
  chatDisabled: boolean;
  contractIds: string[];
  creatorId: string;
  memberIds: string[];
  mostRecentActivityTime: number;
  slug: string;
  anyoneCanJoin: boolean;
  type: string;
}
