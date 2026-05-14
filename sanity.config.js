import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./sanity/schemaTypes/index.js";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET;

if (!projectId) {
  throw new Error("Missing SANITY_STUDIO_PROJECT_ID.");
}

if (!dataset) {
  throw new Error("Missing SANITY_STUDIO_DATASET.");
}

export default defineConfig({
  name: "nanacha",
  title: "nanacha menu",
  projectId,
  dataset,
  basePath: "/admin",
  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
});
