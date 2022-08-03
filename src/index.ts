import fetch from "node-fetch";

const BASE_URL = (() => {
  if (process.env.NODE_ENV === "production") return "https://manifold.markets";
  return "https://dev.manifold.markets";
})();

console.log();
export class Manifold {
  constructor(public apiKey: string) {}

  public post<RetVal>({ path, body }: { path: string; body: any }) {
    return fetch(`${BASE_URL}/api/v0${path}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  // public createMarket: ({
  //     apiKey,
  //     summary,
  //     terms,
  //     maturesAt,
  //     probability,
  //     wagerId,
  //   }: {
  //     apiKey: string;
  //     summary: string;
  //     terms: string;
  //     maturesAt: number;
  //     probability: number;
  //     wagerId: string;
  //   }) =>
  //     postManifoldMarkets({
  //       path: "/market",
  //       apiKey,
  //       body: {
  //         outcomeType: "BINARY",
  //         question: summary,
  //         description: {
  //           type: "doc",
  //           content: [
  //             {
  //               type: "paragraph",
  //               content: [
  //                 {
  //                   type: "text",
  //                   text: `${terms}\n\nThis market is derived from a wager on WagerWith.me: ${process.env.BASE_URL}/wager/${wagerId}`,
  //                 },
  //               ],
  //             },
  //           ],
  //         },
  //         closeTime: maturesAt, // FIXME: what if today...
  //         tags: ["wagerwithme"],
  //         initialProb: probability * 100, // me gusta
  //       },
  //     }),
}
