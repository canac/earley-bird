import { readFileSync } from "node:fs";
import { join } from "node:path";

let version: string | null = null;

// Extract the earley-bird package version from the package.json
export function getEarleyBirdVersion(): string {
  if (version === null) {
    version = JSON.parse(
      readFileSync(join(__dirname, "../package.json"), "utf8")
    ).version as string;
  }

  return version;
}
