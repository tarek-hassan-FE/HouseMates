import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Roomies",
    short_name: "Roomies",
    description: "Gamified chores and shared expenses for roommates",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8f9ff",
    theme_color: "#0058be",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
