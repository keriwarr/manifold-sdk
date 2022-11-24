# Manifold Markets TS SDK

A simple wrapper around the manifold markets API: https://docs.manifold.markets/api

### Usage

```typescript
// commonjs/`require()` is not supported.
// you make need to set `"type": "module"` in your package.json and something
// like `"module": "ESNext"` and `"moduleResolution": "node"` in your tsconfig
import { Manifold } from "manifold-sdk";

// you may omit the api key if you're not making authed requests.
//
// The SDK will hit dev.manifold.markets, unless NODE_ENV is set to "production"
const manifold = new Manifold("YOUR_API_KEY");

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
- throws an error if the API returns a 4XX or 5XX
- logs to console in development

### Potential improvements

- introducing classes representing objects such as users, markets, and bets, with convenience methods.
- better types
- use older version of node-fetch, to support commonjs
- or just demand that the user supplies fetch, enable usage in browser

## Local dev

```
yarn start
# elsewhere:
yarn add manifold-sdk@portal:<path_to_this_dir>
```
