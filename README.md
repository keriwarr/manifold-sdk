# Manifold Markets TS SDK

A simple wrapper around the manifold markets API: https://docs.manifold.markets/api

- written in Typescript, all methods are typed
  - manifold iterates very quickly! these types are frequently out of date
- zero dependencies

### Usage

Can be used in the browser or in node. Requires the `fetch` global API which
means that no additional steps are necessary if you're building for modern
browsers, but if you're using node you should probably either run node with the
`--experimental-fetch` flag, or install node-fetch and [polyfill
it](https://github.com/node-fetch/node-fetch#providing-global-access).

```typescript
import { Manifold } from "manifold-sdk";

// you may omit the api key if you're not making authed requests.
const manifold = new Manifold("YOUR_API_KEY");

// defaults to using https://manifold.markets/api, unless NODE_ENV is set to
// something other than "production" in which case
// https://dev.manifold.markets/api is used
await manifold.getMe(); // returns JSON

const market = await manifold.createMarket({
  description: "test description",
  outcomeType: "BINARY",
  question: "test question",
  closeTime: Date.now() + 1000000,
  initialProb: 33,
}); // returns JSON

const bet = await manifold.createBet({
  contractId: market.id,
  amount: 100,
  outcome: "YES",
});

// etc.
```

- for full documentation, see Manifold's documentation or use your IDE to explore the available methods/arguments/return values.
- wraps `fetch` and throws an error if the API returns a 4XX or 5XX
- logs to console in development

### Potential improvements

- introducing classes representing objects such as users, markets, and bets, with convenience methods.
- improve the types
- add cool utils like [kelly bet calculators](https://github.com/bcongdon/PyManifold#usage)
- tests

## Local dev

```
yarn start
# elsewhere:
yarn add manifold-sdk@portal:<path_to_this_dir>
```
