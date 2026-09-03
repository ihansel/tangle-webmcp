type AssetsBinding = {
  fetch(request: Request): Promise<Response>;
};

type SitesEnvironment = {
  ASSETS: AssetsBinding;
};

export default {
  fetch(request: Request, environment: SitesEnvironment): Promise<Response> {
    return environment.ASSETS.fetch(request);
  },
};
