import {
  BUYER_PROFILE_CACHE_VERSION,
  BUYER_PROFILE_DEMO_CUSTOMER_IDS,
  BUYER_PROFILE_INPUT_FIELDS,
} from "./webmcp/buyerProfileDemo";

type AssetsBinding = {
  fetch(request: Request): Promise<Response>;
};

type SitesEnvironment = {
  ASSETS: AssetsBinding;
  MODAL_BUYER_PROFILE_URL?: string;
  MODAL_PROXY_KEY?: string;
  MODAL_PROXY_SECRET?: string;
};

type SitesExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

const demoCustomerIds = new Set<string>(BUYER_PROFILE_DEMO_CUSTOMER_IDS);

function jsonResponse(value: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

function parseCsvRow(text: string, customerId: string) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",");
  const customerIndex = headers.indexOf("customer_id");
  const line = lines.find(
    (candidate) =>
      candidate.split(",", customerIndex + 2)[customerIndex] === customerId,
  );
  if (!line) return null;
  const values = line.split(",");
  return Object.fromEntries(
    BUYER_PROFILE_INPUT_FIELDS.map((field) => {
      const index = headers.indexOf(field);
      return [field, index >= 0 ? values[index] : ""];
    }),
  );
}

async function handleBuyerProfile(
  request: Request,
  environment: SitesEnvironment,
  context: SitesExecutionContext,
) {
  if (request.method !== "POST")
    return jsonResponse({ error: "Use POST for a hosted profile run." }, 405, {
      allow: "POST",
    });
  const url = new URL(request.url);
  const customerId = decodeURIComponent(
    url.pathname.slice("/api/buyer-profile/".length),
  );
  if (!demoCustomerIds.has(customerId))
    return jsonResponse(
      { error: "This customer is not in the public demo set." },
      404,
    );

  const modalUrl = environment.MODAL_BUYER_PROFILE_URL;
  const modalKey = environment.MODAL_PROXY_KEY;
  const modalSecret = environment.MODAL_PROXY_SECRET;
  if (!modalUrl || !modalKey || !modalSecret)
    return jsonResponse(
      {
        error:
          "The hosted buyer-profile model is not connected yet. The local Tangle examples are still available.",
      },
      503,
    );
  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(modalUrl);
  } catch {
    return jsonResponse({ error: "The hosted model URL is invalid." }, 503);
  }
  if (
    upstreamUrl.protocol !== "https:" ||
    !upstreamUrl.hostname.endsWith(".modal.run")
  )
    return jsonResponse({ error: "The hosted model URL is not trusted." }, 503);

  const cache = await caches.open(BUYER_PROFILE_CACHE_VERSION);
  const cacheKey = new Request(
    new URL(
      `/__model-cache/${BUYER_PROFILE_CACHE_VERSION}/${customerId}`,
      request.url,
    ),
  );
  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("x-tangle-model-cache", "hit");
    return new Response(cached.body, { status: cached.status, headers });
  }

  const datasetResponse = await environment.ASSETS.fetch(
    new Request(
      new URL("/datasets/northstar-commerce/buyer-profiles.csv", request.url),
    ),
  );
  if (!datasetResponse.ok)
    return jsonResponse(
      { error: "The synthetic customer set is unavailable." },
      503,
    );
  const record = parseCsvRow(await datasetResponse.text(), customerId);
  if (!record)
    return jsonResponse(
      { error: "The synthetic customer was not found." },
      404,
    );

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Modal-Key": modalKey,
        "Modal-Secret": modalSecret,
      },
      body: JSON.stringify({ record }),
    });
  } catch {
    return jsonResponse(
      { error: "The hosted model could not be reached. Try the run again." },
      502,
    );
  }
  if (!upstream.ok)
    return jsonResponse(
      { error: "The hosted model could not complete this profile." },
      upstream.status >= 500 ? 502 : upstream.status,
    );

  const response = jsonResponse(await upstream.json(), 200, {
    "cache-control": "public, max-age=86400",
    "x-tangle-model-cache": "miss",
  });
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(
    request: Request,
    environment: SitesEnvironment,
    context: SitesExecutionContext,
  ): Promise<Response> {
    const requestUrl = new URL(request.url);
    if (requestUrl.pathname.startsWith("/api/buyer-profile/"))
      return handleBuyerProfile(request, environment, context);

    const response = await environment.ASSETS.fetch(request);
    if (response.status !== 404 || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const url = new URL(request.url);
    const looksLikeAsset = /\.[a-z0-9]{2,8}$/i.test(url.pathname);
    if (looksLikeAsset || url.pathname.startsWith("/api/")) return response;

    const documentResponse = await environment.ASSETS.fetch(
      new Request(new URL("/", url), request),
    );
    if (!documentResponse.ok) return response;

    const headers = new Headers(documentResponse.headers);
    headers.delete("location");
    return new Response(
      request.method === "HEAD" ? null : documentResponse.body,
      {
        status: 200,
        headers,
      },
    );
  },
};
