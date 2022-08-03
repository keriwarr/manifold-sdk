import fetch from "node-fetch";

console.log("test");

export const foo = (...args: Parameters<typeof fetch>) => fetch(...args);
