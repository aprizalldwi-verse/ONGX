import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ONGX",
    short_name: "ONGX",
    description:
      "Katalog film, series, dan anime dengan tautan langsung ke provider resmi. Cepat, ringan, mobile-first.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    lang: "id",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
