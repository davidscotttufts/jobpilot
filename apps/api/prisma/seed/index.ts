import { db } from "@/common/database";
import { seedJobBoards } from "./job-boards";
import { seedProfileBoards } from "./profile-boards";
import { seedSuperAdmin } from "./super-admin";

// Insertion order is run order: profile-boards needs the catalog that job-boards seeds.
const seeders = {
  "job-boards": { fn: seedJobBoards, description: "Seed the global job-board catalog" },
  "profile-boards": {
    fn: seedProfileBoards,
    description: "Link every profile to the default boards",
  },
  "super-admin": { fn: seedSuperAdmin, description: "Reconcile SUPER_ADMIN_EMAIL against the DB" },
} as const;

type SeederName = keyof typeof seeders;

function printHelp(): void {
  console.log("\n🌱 Database seed\n");
  console.log("Usage: bun run db:seed [options]\n");
  console.log("Options:");
  console.log("  --help, -h        Show this message");
  console.log("  --list            List the available seeders");
  console.log("  --only <names>    Run only these seeders (comma-separated)\n");
  console.log("Examples:");
  console.log("  bun run db:seed");
  console.log("  bun run db:seed --only super-admin");
  console.log("  bun run db:seed --only job-boards,profile-boards\n");
}

function listSeeders(): void {
  console.log("\n📋 Available seeders:\n");
  for (const [name, { description }] of Object.entries(seeders)) {
    console.log(`  ${name.padEnd(16)} - ${description}`);
  }
  console.log();
}

function parseArgs(): SeederName[] | "all" | "help" | "list" {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    return "help";
  }
  if (args.includes("--list")) {
    return "list";
  }

  const onlyIndex = args.indexOf("--only");
  const only = onlyIndex === -1 ? undefined : args[onlyIndex + 1];
  if (!only) {
    return "all";
  }

  const selected: SeederName[] = [];
  for (const name of only.split(",").map((part) => part.trim())) {
    if (!(name in seeders)) {
      console.error(`❌ Unknown seeder: "${name}". Use --list to see the available ones.`);
      process.exit(1);
    }
    selected.push(name as SeederName);
  }
  return selected;
}

async function main(): Promise<void> {
  const selected = parseArgs();
  if (selected === "help") {
    printHelp();
    return;
  }
  if (selected === "list") {
    listSeeders();
    return;
  }

  const names = selected === "all" ? (Object.keys(seeders) as SeederName[]) : selected;
  console.log("\n🌱 Starting database seed...");
  for (const name of names) {
    console.log(`\n📦 Running seeder: ${name}`);
    await seeders[name].fn();
  }
  console.log("\n🌱 Database seed completed.");
}

main()
  .catch((error) => {
    console.error("❌ Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
