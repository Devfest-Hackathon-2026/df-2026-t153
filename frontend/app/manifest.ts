import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest; Next adds the <link rel="manifest"> itself.
// Metadata routes must opt into static generation under output: "export".
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SanpoLab",
    short_name: "SanpoLab",
    description: "散歩の写真から、今日の主役の裏面を語る",
    lang: "ja",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5ef",
    theme_color: "#f7f5ef",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
