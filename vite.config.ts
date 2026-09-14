import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Load .dev.vars into process.env (simple dotenv replacement) */
function loadDevVars() {
  const varsPath = path.resolve(__dirname, ".dev.vars");
  if (!fs.existsSync(varsPath)) return;
  for (const line of fs.readFileSync(varsPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadDevVars();

/**
 * Dev-only Vite plugin that intercepts /api/s3-proxy/:bucket/* requests
 * and proxies them to the actual S3 endpoint, so local development works
 * without running the Cloudflare Worker.
 *
 * Requires S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY env vars.
 */
function s3ProxyPlugin(): Plugin {
  const hmac = (key: Buffer | string, data: string) =>
    crypto.createHmac("sha256", key).update(data).digest();
  const sha256 = (data: string) => crypto.createHash("sha256").update(data).digest("hex");

  function s3Sign(opts: {
    method: string;
    bucket: string;
    key: string;
    endpoint: string;
    region: string;
    date: Date;
  }) {
    const { method, bucket, key, endpoint, region, date } = opts;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? "";
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? "";
    if (!accessKeyId || !secretAccessKey) return null;

    const host = `${bucket}.${endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
    const isoDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = isoDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const canonicalUri = key ? `/${key.split("/").map(encodeURIComponent).join("/")}` : "/";
    const payloadHash = "UNSIGNED-PAYLOAD";

    const headers: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": isoDate,
    };
    const signedHeaderKeys = Object.keys(headers).sort();
    const canonicalHeaders = signedHeaderKeys.map((k) => `${k}:${headers[k]}\n`).join("");
    const signedHeaders = signedHeaderKeys.join(";");

    const canonicalRequest = [
      method, canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash,
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256", isoDate, credentialScope, sha256(canonicalRequest),
    ].join("\n");

    const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, "s3");
    const kSigning = hmac(kService, "aws4_request");
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    return {
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      ...headers,
    };
  }

  // Bucket config — mirror the Worker's BUCKET_CONFIG (one per library)
  const BUCKETS: Record<string, { endpoint: string; region: string }> = {
    "lexoshqip-arka": { endpoint: "s3.us-east-005.backblazeb2.com", region: "us-east-005" },
    "lexoshqip-agim": { endpoint: "s3.us-east-005.backblazeb2.com", region: "us-east-005" },
    "lexoshqip-lira": { endpoint: "s3.us-east-005.backblazeb2.com", region: "us-east-005" },
  };

  return {
    name: "s3-proxy",
    configureServer(server) {
      server.middlewares.use("/api/s3-proxy", async (req, res) => {
        try {
          const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
          const pathParts = url.pathname.split("/").filter(Boolean);
          // After middleware strip: req.url = /:bucket/:key...
          if (pathParts.length < 2) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Usage: /api/s3-proxy/:bucket/key" }));
            return;
          }
          const bucket = decodeURIComponent(pathParts[0]);
          const s3Key = decodeURIComponent(pathParts.slice(1).join("/")).replace(/^content\//, "");
          const bucketConfig = BUCKETS[bucket];

          if (!bucketConfig) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: `Unknown bucket: ${bucket}` }));
            return;
          }

          const authHeaders = s3Sign({
            method: "GET", bucket, key: s3Key,
            endpoint: `https://${bucketConfig.endpoint}`,
            region: bucketConfig.region, date: new Date(),
          });
          if (!authHeaders) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "S3 credentials not set" }));
            return;
          }

          const s3Url = `https://${bucket}.${bucketConfig.endpoint}/${s3Key.split("/").map(encodeURIComponent).join("/")}`;
          const s3Res = await fetch(s3Url, { headers: authHeaders });

          const headers: Record<string, string> = {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600",
          };
          const ct = s3Res.headers.get("content-type");
          if (ct) headers["Content-Type"] = ct;
          const cl = s3Res.headers.get("content-length");
          if (cl) headers["Content-Length"] = cl;

          res.writeHead(s3Res.status, headers);
          if (s3Res.body) {
            const reader = s3Res.body.getReader();
            const pump = async (): Promise<void> => {
              const { done, value } = await reader.read();
              if (done) { res.end(); return; }
              res.write(value);
              return pump();
            };
            await pump();
          } else {
            res.end();
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: msg }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), s3ProxyPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
