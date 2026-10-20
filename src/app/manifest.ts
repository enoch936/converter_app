import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FileForge",
    short_name: "FileForge",
    description: "Private tools for everyday files.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f1",
    theme_color: "#1f2926",
    icons: [{ src: "/fileforge-icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
