import { execSync, spawn } from "child_process";

// Find tsx binary
let tsxBin;
try {
  tsxBin = execSync("which tsx", { encoding: "utf8" }).trim();
} catch {
  tsxBin = "./node_modules/.bin/tsx";
}

console.log("Starting server with tsx:", tsxBin);

const child = spawn(tsxBin, ["server/index.ts"], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});

child.on("error", (err) => {
  console.error("Failed to start server:", err.message);
  // Fallback: try npx tsx
  console.log("Trying npx tsx...");
  const fallback = spawn("npx", ["tsx", "server/index.ts"], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });
  fallback.on("error", (err2) => {
    console.error("Fallback failed:", err2.message);
    process.exit(1);
  });
  fallback.on("exit", (code) => process.exit(code ?? 1));
});

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
