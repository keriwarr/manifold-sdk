// Note: Some systems which build javascript apps for the browser will
// substitute `process.env.NODE_ENV` for a string like "development" or
// "production" at build time. Others will not, hence the try/catch.

export const ENV = (() => {
  try {
    return process.env.NODE_ENV;
  } catch (e) {
    return undefined;
  }
})();
