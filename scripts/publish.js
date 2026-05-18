const { spawnSync } = require("child_process");

const steps = [
  {
    label: "Sync Lark menu images to local assets",
    command: "npm",
    args: ["run", "lark:sync-images"],
  },
  {
    label: "Sync Lark homepage images to local assets",
    command: "npm",
    args: ["run", "lark:sync-homepage-images"],
  },
  {
    label: "Publish Lark content snapshots",
    command: "npm",
    args: ["run", "lark:publish"],
  },
  {
    label: "Update translation dictionaries",
    command: "npm",
    args: ["run", "i18n:update"],
  },
  {
    label: "Build the site",
    command: "npm",
    args: ["run", "build"],
  },
];

for (const [index, step] of steps.entries()) {
  console.log(`\n[${index + 1}/${steps.length}] ${step.label}`);

  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`\nPublish stopped during: ${step.label}`);
    process.exit(result.status || 1);
  }
}

console.log("\nPublish workflow completed successfully.");
