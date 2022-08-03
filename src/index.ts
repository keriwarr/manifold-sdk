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

const wrappedFetch = async <RetVal>(...args: Parameters<typeof fetch>) => {
  const resp = await fetch(...args);

  const contentType = resp.headers.get("content-type");

  if (!contentType || contentType.indexOf("application/json") === -1) {
    throw new Error(
      `Unexpectedly received non-JSON response: ${await resp.text()}`
    );
  }

  const json = await resp.json();

  if (!resp.ok) {
    throw new ManifoldError(resp.status, json);
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
  type: "BINARY";
  // between 1 and 99 inclusive
  initialProb: number;
}

interface FreeResponseCreateMarketArgs extends GenericCreateMarketArgs {
  type: "FREE_RESPONSE";
}

interface NumericCreateMarketArgs extends GenericCreateMarketArgs {
  type: "NUMERIC";
  // The minimum value that the market may resolve to.
  min: number;
  // The maximum value that the market may resolve to.
  max: number;
}

type CreateMarketArgs =
  | BinaryCreateMarketArgs
  | FreeResponseCreateMarketArgs
  | NumericCreateMarketArgs;

interface CreateMarketResponse {
  id: string;
}

export class Manifold {
  constructor(public apiKey: string) {}

  public post<RetVal, Body>({ path, body }: { path: string; body: Body }) {
    return wrappedFetch<RetVal>(`${BASE_URL}/api/v0${path}`, {
      method: "POST",

      headers: {
        Authorization: `Key ${this.apiKey}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify(body),
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
}
