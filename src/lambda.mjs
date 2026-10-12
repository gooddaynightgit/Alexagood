// AWS Lambda entry point (Function URL or API Gateway HTTP API, payload v2).
import { handleHttp } from "./mcp.mjs";

export async function handler(event) {
  const body = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body) : "";
  const res = handleHttp({ method: event.requestContext?.http?.method, headers: event.headers ?? {}, body });
  return { statusCode: res.status, headers: res.headers, body: res.body };
}
