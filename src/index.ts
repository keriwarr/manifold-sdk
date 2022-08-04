import fetch from "node-fetch";

const BASE_URL = (() => {
  if (process.env.NODE_ENV === "production") return "https://manifold.markets";
  return "https://dev.manifold.markets";
})();

export class ManifoldError extends Error {
  constructor(public statusCode: number, public errorResponse: unknown) {
    super(`[${statusCode}]: ${JSON.stringify(errorResponse, null, 2)}`);
    Object.setPrototypeOf(this, ManifoldError.prototype);
  }
}

const isEmpty = (obj: Record<string, unknown>) => Object.keys(obj).length === 0;

const log = (message: string) => {
  if (process.env.NODE_ENV === "production") return;

  console.log(message);
};

const logError = (message: Error) => {
  if (process.env.NODE_ENV === "production") return;

  console.error(message);
};

export const wrappedFetch = async <RetVal>(
  ...args: Parameters<typeof fetch>
) => {
  log(`${args[1]?.method} '${args[0]}' ...`);
  const resp = await fetch(...args);

  const contentType = resp.headers.get("content-type");

  if (!contentType || contentType.indexOf("application/json") === -1) {
    const error = new Error(
      `Unexpectedly received non-JSON response: ${await resp.text()}`
    );
    logError(error);
    throw error;
  }

  const json = await resp.json();

  if (!resp.ok) {
    const error = new ManifoldError(resp.status, json);
    logError(error);
    throw error;
  }

  return json as RetVal;
};

interface GenericCreateMarketArgs {
  // The headline question for the market.
  question: string;
  // A long description describing the rules for the market.
  description: string;
  // The time at which the market will close, represented as milliseconds since the epoch.
  closeTime: number;
  // An array of string tags for the market.
  tags?: string[];
}

interface BinaryCreateMarketArgs extends GenericCreateMarketArgs {
  outcomeType: "BINARY";
  // between 1 and 99 inclusive
  initialProb: number;
}

interface FreeResponseCreateMarketArgs extends GenericCreateMarketArgs {
  outcomeType: "FREE_RESPONSE";
}

interface NumericCreateMarketArgs extends GenericCreateMarketArgs {
  outcomeType: "NUMERIC";
  // The minimum value that the market may resolve to.
  min: number;
  // The maximum value that the market may resolve to.
  max: number;
}

export type CreateMarketArgs =
  | BinaryCreateMarketArgs
  | FreeResponseCreateMarketArgs
  | NumericCreateMarketArgs;

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
  bets: Bet[];
  comments: Comment[];
  answers?: Answer[];
}
export interface LiteMarket {
  // Unique identifer for this market
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
  // keri: might be nice to discriminate the type by outcometype. e.g. the only outcomes in the pool are "YES" and "NO" for binary
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

interface CreateMarketResponse extends Omit<LiteMarket, "url" | "probability"> {
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

export class Manifold {
  constructor(public apiKey?: string) {}

  public get<
    RetVal,
    Params extends Record<string, string> | undefined = undefined
  >({
    path,
    params,
    requiresAuth = false,
    apiKey = this.apiKey,
  }: {
    path: string;
    params?: Params;
    requiresAuth?: boolean;
    apiKey?: string;
  }) {
    if (requiresAuth && !apiKey) {
      throw new Error("Missing API Key");
    }

    const fullpath = (() => {
      const pathname = `${BASE_URL}/api/v0${path}`;

      if (!params || isEmpty(params)) return pathname;

      return `${pathname}?${new URLSearchParams(params).toString()}`;
    })();

    return wrappedFetch<RetVal>(fullpath, {
      method: "GET",

      headers: {
        ...(requiresAuth && {
          Authorization: `Key ${apiKey}`,
        }),
      },
    });
  }

  public post<RetVal, Body>({
    path,
    body,
    requiresAuth = true,
    apiKey = this.apiKey,
  }: {
    path: string;
    body: Body;
    requiresAuth?: boolean;
    apiKey?: string;
  }) {
    if (requiresAuth && !apiKey) {
      throw new Error("Missing API Key");
    }

    return wrappedFetch<RetVal>(`${BASE_URL}/api/v0${path}`, {
      method: "POST",

      headers: {
        ...(requiresAuth && {
          Authorization: `Key ${apiKey}`,
        }),
        "Content-Type": "application/json",
      },

      body: JSON.stringify(body),
    });
  }

  public getMe() {
    return this.get<User>({ path: "/me", requiresAuth: true });
  }

  public getUser({
    username,
    id,
  }: { username: string; id?: never } | { username?: never; id: string }) {
    if (username) {
      return this.get<User>({ path: `/user/${username}` });
    } else if (id) {
      return this.get<User>({ path: `/user/by-id/${id}` });
    } else {
      throw new Error("Need username or id to fetch user");
    }
  }

  public getUsers() {
    return this.get<User[]>({ path: "/users" });
  }

  public getGroups() {
    return this.get<Group[]>({ path: "/groups" });
  }

  public getGroup({
    slug,
    id,
  }: { slug: string; id?: never } | { slug?: never; id: string }) {
    if (slug) {
      return this.get<Group>({ path: `/groups/${slug}` });
    } else if (id) {
      return this.get<Group>({ path: `/groups/by-id/${id}` });
    } else {
      throw new Error("Need slug or id to fetch group");
    }
  }

  public getMarket({
    slug,
    id,
  }: { slug: string; id?: never } | { slug?: never; id: string }) {
    if (slug) {
      return this.get<FullMarket>({ path: `/slug/${slug}` });
    } else if (id) {
      return this.get<FullMarket>({ path: `/market/${id}` });
    } else {
      throw new Error("Need slug or id to fetch market");
    }
  }

  public getMarkets({ limit, before }: { limit?: number; before?: string }) {
    const params = {
      ...(limit && { limit: limit.toString() }),
      ...(before && { before }),
    };

    return this.get<LiteMarket[], typeof params>({
      path: "/markets",
      params,
    });
  }

  public async getAllMarkets() {
    const allMarkets = [];
    let before: string | undefined = undefined;

    for (;;) {
      const markets: LiteMarket[] = await this.getMarkets({ before });

      allMarkets.push(...markets);
      before = markets[markets.length - 1].id;

      if (markets.length < 1000) break;
    }

    return allMarkets;
  }

  public getBets({
    username,
    market,
    limit,
    before,
  }: {
    username?: string;
    market?: string;
    limit?: number;
    before?: string;
  }) {
    const params = {
      ...(username && { username }),
      ...(market && { market }),
      ...(limit && { limit: limit.toString() }),
      ...(before && { before }),
    };

    return this.get<Bet[], typeof params>({
      path: "/bets",
      params,
    });
  }

  // Creates a new market on behalf of the authorized user.
  public createMarket({ description, ...otherArgs }: CreateMarketArgs) {
    const body = {
      ...otherArgs,

      description: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: description,
              },
            ],
          },
        ],
      },
    };

    return this.post<CreateMarketResponse, typeof body>({
      path: "/market",
      body,
    });
  }

  public createBet(body: {
    amount: number;
    contractId: string;
    outcome: string;
    limitProp?: number;
  }) {
    return this.post<Bet, typeof body>({
      path: "/bet",
      body,
    });
  }

  public resolveMarket({
    marketId,
    ...body
  }: {
    marketId: string;
    outcome: "YES" | "NO" | "MKT" | "CANCEL" | number;
    probabilityInt?: number;
    resolutions?: Array<{ answer: string; pct: number }>;
    value?: number;
  }) {
    return this.post<{ betId: string }, typeof body>({
      path: `/market/${marketId}/resolve`,
      body,
    });
  }

  public sellShares({
    marketId,
    ...body
  }: {
    marketId: string;
    outcome?: "YES" | "NO";
    shares?: number;
  }) {
    return this.post<{ status: "success" }, typeof body>({
      path: `/market/${marketId}/sell`,
      body,
    });
  }
}
