import {
  Bet,
  CreateMarketArgs,
  CreateMarketResponse,
  FullMarket,
  Group,
  LiteMarket,
  User,
} from "./types";
import { wrappedFetch } from "./wrappedFetch";
import { ENV } from "./env";

// we will point to manifold's dev API if and only if the environment has been
// explicitly set to something other than "production".
const DEFAULT_API_URL_ROOT = (() => {
  const PROD_API_URL_ROOT = "https://manifold.markets/api/v0";
  const DEV_API_URL_ROOT = "https://dev.manifold.markets/api/v0";

  if (ENV === "production") return PROD_API_URL_ROOT;
  if (ENV === undefined) return PROD_API_URL_ROOT;
  return DEV_API_URL_ROOT;
})();

export class Manifold {
  /**
   * @param apiKey `apiKey` may be omitted, in which case only unauthenticated
   * endpoints may be used
   * @param apiUrlRoot `apiUrlRoot` defaults to //manifold.markets when NODE_ENV
   * is undefined or is set to production and to //dev.manifold.markets
   * otherwise
   */
  constructor(
    public apiKey?: string | undefined,
    public apiUrlRoot: string = DEFAULT_API_URL_ROOT
  ) {}

  /**
   * Executes a GET request against the given path with the given params
   */
  public _get<
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
    let url = this.buildUrl(path);
    if (params && Object.keys(params).length > 0) {
      url += `?${new URLSearchParams(params).toString()}`;
    }

    return wrappedFetch<RetVal>(url, {
      method: "GET",
      headers: {
        ...this.buildAuthHeaders({ apiKey, requiresAuth }),
      },
    });
  }

  /**
   * Executes a POST request against the given path with the given body
   */
  public _post<RetVal, Body>({
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
    const url = this.buildUrl(path);

    return wrappedFetch<RetVal>(url, {
      method: "POST",
      headers: {
        ...this.buildAuthHeaders({ apiKey, requiresAuth }),
        "Content-Type": "application/json",
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  }

  public getUser({
    username,
    id,
  }: { username: string; id?: never } | { username?: never; id: string }) {
    let path: string;

    if (username !== undefined) {
      path = `/user/${username}`;
    } else if (id !== undefined) {
      path = `/user/by-id/${id}`;
    } else {
      throw new Error("Need username or id to fetch user");
    }

    return this._get<User>({ path });
  }

  public getMe() {
    return this._get<User>({ path: "/me", requiresAuth: true });
  }

  public getGroups(params: { availableToUserId?: string } = {}) {
    return this._get<Group[], typeof params>({
      path: "/groups",
      params,
    });
  }

  public getGroup({
    slug,
    id,
  }: { slug: string; id?: never } | { slug?: never; id: string }) {
    let path: string;

    if (slug !== undefined) {
      path = `/group/${slug}`;
    } else if (id !== undefined) {
      path = `/group/by-id/${id}`;
    } else {
      throw new Error("Need slug or id to fetch group");
    }

    return this._get<Group>({ path });
  }

  public getGroupMarkets({ groupId }: { groupId: string }) {
    return this._get<LiteMarket[]>({ path: `/group/by-id/${groupId}/markets` });
  }

  public getMarkets({
    limit,
    ...restParams
  }: {
    limit?: number;
    before?: string;
  }) {
    const params = {
      ...restParams,
      ...(limit !== undefined && { limit: limit.toString() }),
    };
    return this._get<LiteMarket[], typeof params>({
      path: "/markets",
      params,
    });
  }

  public getMarket({
    slug,
    id,
  }: { slug: string; id?: never } | { slug?: never; id: string }) {
    let path: string;

    if (slug !== undefined) {
      path = `/slug/${slug}`;
    } else if (id !== undefined) {
      path = `/market/${id}`;
    } else {
      throw new Error("Need slug or id to fetch market");
    }

    return this._get<FullMarket>({ path });
  }

  public getComments({
    marketId,
    marketSlug,
  }:
    | { marketId: string; marketSlug?: never }
    | { marketId?: never; marketSlug: string }) {
    let params: { contractId: string } | { contractSlug: string };

    if (marketId !== undefined) {
      params = { contractId: marketId };
    } else if (marketSlug !== undefined) {
      params = { contractSlug: marketSlug };
    } else {
      throw new Error("Need slug or id to fetch market comments");
    }

    return this._get<Comment[], typeof params>({
      path: `/comments`,
      params,
    });
  }

  public getUsers() {
    return this._get<User[]>({ path: "/users" });
  }

  public createBet({
    marketId,
    ...restParams
  }: {
    amount: number;
    marketId: string;
    outcome: string;
    limitProb?: number;
  }) {
    const body = {
      ...restParams,
      contractId: marketId,
    };

    return this._post<{ betId: string }, typeof body>({
      path: "/bet",
      body,
    });
  }

  public cancelBet({ id }: { id: string }) {
    return this._post<unknown, undefined>({
      path: `/bet/cancel/${id}`,
      body: undefined,
    });
  }

  // Creates a new market on behalf of the authorized user.
  public createMarket(body: CreateMarketArgs) {
    return this._post<CreateMarketResponse, typeof body>({
      path: "/market",
      body,
    });
  }

  public addLiquidity({
    marketId,
    ...body
  }: {
    marketId: string;
    amount: number;
  }) {
    return this._post<unknown, typeof body>({
      path: `/market/${marketId}/add-liquidity`,
      body,
    });
  }

  public closeMarket({
    marketId,
    ...body
  }: {
    marketId: string;
    closeTime?: number;
  }) {
    return this._post<unknown, typeof body>({
      path: `/market/${marketId}/close`,
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
    return this._post<{ betId: string }, typeof body>({
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
    return this._post<{ status: "success" }, typeof body>({
      path: `/market/${marketId}/sell`,
      body,
    });
  }

  public createComment({
    marketId,
    ...restBody
  }: {
    marketId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content?: any;
    html?: string;
    markdown?: string;
  }) {
    const body = {
      ...restBody,
      contractId: marketId,
    };

    return this._post<Comment, typeof body>({
      path: `/comment`,
      body: body,
    });
  }

  public getBets({
    limit,
    ...restParams
  }: {
    username?: string;
    userId?: string;
    marketId?: string;
    marketSlug?: string;
    limit?: number;
    before?: string;
  }) {
    const params = {
      ...restParams,
      ...(limit !== undefined && { limit: limit.toString() }),
    };

    return this._get<Bet[], typeof params>({
      path: "/bets",
      params,
    });
  }

  public async getAllMarkets() {
    const allMarkets = [];
    let before: string | undefined = undefined;

    for (;;) {
      const markets: LiteMarket[] = await this.getMarkets({
        before,
        limit: 1000,
      });

      allMarkets.push(...markets);
      before = markets[markets.length - 1].id;

      if (markets.length < 1000) break;
    }

    return allMarkets;
  }

  /** Private Members */

  private buildUrl(path: string) {
    let url = this.apiUrlRoot;

    if (!path.startsWith("/")) {
      url += "/";
    }

    url += path;

    return url;
  }

  private buildAuthHeaders({
    apiKey,
    requiresAuth,
  }: {
    apiKey: string | undefined;
    requiresAuth: boolean;
  }) {
    return {
      ...(requiresAuth &&
        apiKey && {
          Authorization: `Key ${apiKey}`,
        }),
    };
  }
}
