import { ENV } from "./env";

export class NetworkError extends Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(message: string, public resp: any) {
    super(message);
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class ManifoldError extends NetworkError {
  constructor(
    public statusCode: number,
    public errorResponse: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resp: any
  ) {
    super(`[${statusCode}]: ${JSON.stringify(errorResponse, null, 2)}`, resp);
    Object.setPrototypeOf(this, ManifoldError.prototype);
  }
}
const log = (message: string) => {
  if (ENV === "production") return;

  console.log(message);
};
const logError = (message: Error) => {
  if (ENV === "production") return;

  console.error(message);
};

export const wrappedFetch = async <RetVal>(
  ...args: Parameters<typeof fetch>
) => {
  log(`${args[1]?.method} '${args[0]}' ...`);
  const resp = await fetch(...args);

  const contentType = resp.headers.get("content-type");

  if (contentType === null || contentType.indexOf("application/json") === -1) {
    if (resp.ok) {
      const error = new NetworkError(
        `Unexpectedly received non-JSON response: ${await resp.text()}`,
        resp
      );
      logError(error);
      throw error;
    } else {
      const error = new ManifoldError(resp.status, resp.text(), resp);
      logError(error);
      throw error;
    }
  }

  const json = await resp.json();

  if (!resp.ok) {
    const error = new ManifoldError(resp.status, json, resp);
    logError(error);
    throw error;
  }

  return json as RetVal;
};
