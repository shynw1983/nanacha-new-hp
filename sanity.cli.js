import { defineCliConfig } from "sanity/cli";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET;

if (!projectId) {
  throw new Error("Missing SANITY_STUDIO_PROJECT_ID.");
}

if (!dataset) {
  throw new Error("Missing SANITY_STUDIO_DATASET.");
}

export default defineCliConfig({
  project: {
    basePath: "/admin",
  },
  api: {
    projectId,
    dataset,
  },
});
