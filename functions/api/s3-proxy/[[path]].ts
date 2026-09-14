interface Env {
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_REGION?: string;
}

const BUCKET_CONFIG: Record<string, { endpoint: string; region: string }> = {
  "lexoshqip-arka": {
    endpoint: "s3.us-east-005.backblazeb2.com",
    region: "us-east-005",
  },
  "lexoshqip-agim": {
    endpoint: "s3.us-east-005.backblazeb2.com",
    region: "us-east-005",
  },
  "lexoshqip-lira": {
    endpoint: "s3.us-east-005.backblazeb2.com",
    region: "us-east-005",
  },
};

const DEFAULT_REGION = "us-west-004";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Content-Type",
  "Access-Control-Max-Age": "86400",
};

async function hmacKey(key: CryptoKey | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = key instanceof CryptoKey
    ? key
    : await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function sha256(data: ArrayBuffer | string): Promise<string> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function s3Sign(
  method: string,
  bucket: string,
  key: string,
  endpoint: string,
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  headers: Record<string, string> = {},
): Promise<Record<string, string>> {
  const host = `${bucket}.${endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  const now = new Date();
  const isoDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = isoDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const canonicalUri = `/${key.split("/").map(encodeURIComponent).join("/")}`;
  const payloadHash = "UNSIGNED-PAYLOAD";

  const allHeaders: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": isoDate,
    ...headers,
  };

  const signedHeaderKeys = Object.keys(allHeaders).sort();
  const canonicalHeaders = signedHeaderKeys.map((k) => `${k}:${allHeaders[k]}\n`).join("");
  const signedHeaders = signedHeaderKeys.join(";");

  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    isoDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join("\n");

  const kDate = await hmacKey(
    new TextEncoder().encode(`AWS4${secretAccessKey}`),
    dateStamp,
  );
  const kRegion = await hmacKey(kDate, region);
  const kService = await hmacKey(kRegion, "s3");
  const kSigning = await hmacKey(kService, "aws4_request");

  const signatureBuf = await crypto.subtle.sign(
    "HMAC",
    kSigning,
    new TextEncoder().encode(stringToSign),
  );
  const signature = [...new Uint8Array(signatureBuf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    ...allHeaders,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/^\/api\/s3-proxy\/([^/]+)\/(.+)$/);
  if (!pathMatch) {
    return new Response("Not Found", { status: 404 });
  }

  const bucket = decodeURIComponent(pathMatch[1]);
  const s3Key = decodeURIComponent(pathMatch[2]).replace(/^content\//, "");

  const bucketConfig = BUCKET_CONFIG[bucket];
  if (!bucketConfig) {
    return new Response(
      JSON.stringify({ error: `Unknown bucket: ${bucket}` }),
      { status: 404, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
    );
  }

  if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    return new Response(
      JSON.stringify({ error: "S3 credentials not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
    );
  }

  const region = env.S3_REGION || DEFAULT_REGION;
  const baseUrl = `https://${bucket}.${bucketConfig.endpoint}`;
  const s3Url = `${baseUrl}/${s3Key.split("/").map(encodeURIComponent).join("/")}`;

  try {
    const authHeaders = await s3Sign(
      "GET",
      bucket,
      s3Key,
      bucketConfig.endpoint,
      bucketConfig.region,
      env.S3_ACCESS_KEY_ID,
      env.S3_SECRET_ACCESS_KEY,
    );

    const s3Response = await fetch(s3Url, {
      method: "GET",
      headers: authHeaders,
    });

    const responseHeaders = new Headers(CORS_HEADERS);
    const contentType = s3Response.headers.get("content-type");
    if (contentType) responseHeaders.set("Content-Type", contentType);
    const contentLength = s3Response.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);
    const contentRange = s3Response.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);
    const etag = s3Response.headers.get("etag");
    if (etag) responseHeaders.set("ETag", etag);
    responseHeaders.set("Cache-Control", "public, max-age=3600");

    return new Response(s3Response.body, {
      status: s3Response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `S3 proxy error: ${message}` }),
      { status: 502, headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
    );
  }
};
