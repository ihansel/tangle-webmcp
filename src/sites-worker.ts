type AssetsBinding = {
  fetch(request: Request): Promise<Response>;
};

type SitesEnvironment = {
  ASSETS: AssetsBinding;
};

export default {
  async fetch(
    request: Request,
    environment: SitesEnvironment,
  ): Promise<Response> {
    const response = await environment.ASSETS.fetch(request);
    if (response.status !== 404 || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const url = new URL(request.url);
    const looksLikeAsset = /\.[a-z0-9]{2,8}$/i.test(url.pathname);
    if (looksLikeAsset || url.pathname.startsWith("/api/")) return response;

    return environment.ASSETS.fetch(
      new Request(new URL("/index.html", url), request),
    );
  },
};
