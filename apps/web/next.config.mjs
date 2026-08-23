import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  // Emit a self-contained server bundle for a small production container image.
  output: "standalone",
  // Trace workspace dependencies from the monorepo root so they're bundled.
  outputFileTracingRoot: join(__dirname, "../../"),
}

export default nextConfig
