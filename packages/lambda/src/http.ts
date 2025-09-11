import type {
  APIGatewayProxyEventV2,
  Context,
  Callback,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { createHmac, timingSafeEqual } from "node:crypto";

const verifySlackSignature = ({
  signingSecret,
  timestamp,
  body,
  signature,
}: {
  signingSecret: string;
  timestamp: string;
  body: string;
  signature: string;
}): boolean => {
  const now = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 60 * 5) return false;

  const basestring = `v0:${timestamp}:${body}`;

  const tag = createHmac("sha256", signingSecret)
    .update(basestring)
    .digest("hex");
  const generatedSignature = `v0=${tag}`;

  const a = Buffer.from(generatedSignature, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

const client = new LambdaClient();

const handleRequest = async (
  event: APIGatewayProxyEventV2,
  _context: Context,
  _callback: Callback
): Promise<APIGatewayProxyStructuredResultV2> => {
  if (process.env.SLACK_SIGNING_SECRET == null) return { statusCode: 500 };
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (event.requestContext.http.method !== "POST") return { statusCode: 405 };
  if (event.body == null) return { statusCode: 422 };
  const body = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  console.info(event.headers);
  const timestamp = event.headers["x-slack-request-timestamp"];
  const signature = event.headers["x-slack-signature"];
  if (timestamp == null || signature == null) return { statusCode: 401 };
  const isValidRequest = verifySlackSignature({
    signingSecret,
    body,
    signature,
    timestamp,
  });
  if (!isValidRequest) return { statusCode: 403 };
  const params = new URLSearchParams(body);
  const responseUrl = params.get("response_url");
  if (responseUrl == null) return { statusCode: 422 };
  if (process.env.HTTP_WORKER_FUNCTION_NAME == null) return { statusCode: 500 };
  const command = new InvokeCommand({
    FunctionName: process.env.HTTP_WORKER_FUNCTION_NAME,
    Payload: Buffer.from(JSON.stringify({ responseUrl })),
    InvocationType: "Event",
  });
  void (await client.send(command));
  return { statusCode: 200, body: "Accepted!" };
};

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context,
  callback: Callback
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const res = await handleRequest(event, context, callback);
    void (res.statusCode ?? 0 >= 400
      ? void console.error(res)
      : void console.info(res));
    return res;
  } catch (e: unknown) {
    console.error(e);
    return { statusCode: 500 };
  }
};
