class FaviconManager {
  private defaultFavicon = "/strand-mark.svg";
  private statusIcons = {
    success: "/strand-mark-success.svg",
    failed: "/strand-mark-failed.svg",
    loading: "/strand-mark-loading.svg",
    paused: "/strand-mark-paused.svg",
  };

  updateFavicon(
    status: "success" | "failed" | "loading" | "paused" | "default",
  ) {
    const link =
      (document.querySelector("link[rel*='icon']") as HTMLLinkElement) ||
      document.createElement("link");

    link.type = "image/svg+xml";
    link.rel = "shortcut icon";
    link.href =
      status === "default" ? this.defaultFavicon : this.statusIcons[status];

    if (!document.querySelector("link[rel*='icon']")) {
      document.getElementsByTagName("head")[0].appendChild(link);
    }
  }

  reset() {
    this.updateFavicon("default");
  }
}

export const faviconManager = new FaviconManager();
