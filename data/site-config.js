const siteConfig = {
  name: "nanacha",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://nanacha-new-hp.vercel.app",
  title: "nanacha｜タピオカ・ミルクティー・フルーツティー",
  description:
    "nanacha は、黒糖タピオカミルク、フルーツティー、スムージー、八女抹茶ラテを楽しめるティースタンド。福岡清川店から、気軽に楽しめる一杯をお届けします。",
  ogImagePath: "/assets/hero/hero-01.png",
};

module.exports = siteConfig;
