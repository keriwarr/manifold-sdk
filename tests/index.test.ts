import { Manifold } from "../src";
import { writeFileSync, readFileSync } from "node:fs";
import fetch, { Headers, Request, Response } from "node-fetch";
import type { FetchInterceptorResponse } from "fetch-intercept";

let reqResPairs: Array<{
  req: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
  };
  res: {
    headers: Record<string, string>;
    status: number;
    statusText: string;
    body: string;
  };
}> = [];

const shallowCompare = (
  obj1: Record<string, string>,
  obj2: Record<string, string>
) =>
  Object.keys(obj1).length === Object.keys(obj2).length &&
  Object.keys(obj1).every((key) => obj1[key] === obj2[key]);

// @ts-expect-error
globalThis.Headers = Headers;
// @ts-expect-error
globalThis.Request = Request;
// @ts-expect-error
globalThis.Response = Response;

let fetchIntercept: any;
if (process.env.USE_NETWORK_AND_RECORD !== undefined) {
  // polyfill fetch with a REAL fetch implementation!

  // @ts-expect-error
  globalThis.fetch = fetch;
  fetchIntercept = require("fetch-intercept");
} else {
  // polyfill fetch with a bespoke mock that returns responses from
  // recorded-api-calls.json

  reqResPairs = JSON.parse(
    readFileSync("./recorded-api-calls.json", {
      encoding: "utf-8",
    })
  );
  // @ts-expect-error
  globalThis.fetch = (url, config) => {
    const method = config?.method || "GET";
    const headers = (config?.headers as Record<string, string>) || {};
    const body = config?.body || "";

    const recording = reqResPairs.find(({ req }) => {
      return (
        req.url === url &&
        req.method === method &&
        req.body === body &&
        shallowCompare(req.headers, headers)
      );
    });

    if (!recording) {
      throw new Error("Recording not available!");
    }

    return Promise.resolve(
      new Response(recording.res.body, {
        headers: recording.res.headers,
        status: recording.res.status,
        statusText: recording.res.statusText,
      })
    );
  };
}

const recordRequest = () => {
  let setDoneSignal: () => void;
  const doneSignal = new Promise<void>((resolve) => {
    setDoneSignal = resolve;
  });

  const unregisterFetchInterceptor = fetchIntercept.register({
    response: function (response: FetchInterceptorResponse) {
      const clonedRequest = response.request.clone();
      const clonedResponse = response.clone();

      (async () => {
        const responseHeaders = Object.fromEntries(
          [...clonedResponse.headers.entries()].filter(([key]) =>
            ["content-length", "content-type", "x-matched-path"].includes(key)
          )
        );

        reqResPairs.push({
          req: {
            url: clonedRequest.url,
            method: clonedRequest.method,
            headers: Object.fromEntries(clonedRequest.headers.entries()),
            body: await clonedRequest.text(),
          },
          res: {
            headers: responseHeaders,
            status: clonedResponse.status,
            statusText: clonedResponse.statusText,
            body: await clonedResponse.text(),
          },
        });

        setDoneSignal();
      })();

      return response;
    },
  });

  doneSignal.then(() => {
    unregisterFetchInterceptor();
  });

  return doneSignal;
};

describe("manifold", () => {
  let requestRecorderPromise: Promise<void> | null = null;

  beforeEach(() => {
    if (process.env.USE_NETWORK_AND_RECORD !== undefined) {
      requestRecorderPromise = recordRequest();
    }
  });

  afterEach(async () => {
    if (process.env.USE_NETWORK_AND_RECORD !== undefined) {
      await requestRecorderPromise;
    }
  });

  describe("api", () => {
    it("gets a market", async () => {
      const manifold = new Manifold();
      await manifold.getMarket({ id: "pdcWgwpzV4RsJjQGVq9v" });
    });

    it("gets a user", async () => {
      const manifold = new Manifold();
      await manifold.getUser({ id: "6hHpzvRG0pMq8PNJs7RZj2qlZGn2" });
    });
  });

  if (process.env.USE_NETWORK_AND_RECORD !== undefined) {
    afterAll(() => {
      writeFileSync(
        "./recorded-api-calls.json",
        JSON.stringify(reqResPairs, null, 2),
        {
          encoding: "utf-8",
        }
      );
    });
  }
});
