import type { Config } from "@react-router/dev/config";

/** Determine the base path for GitHub Pages */
function getBasePath(): string | undefined {
  const repo = process.env.GITHUB_REPOSITORY?.split("/").pop();
  return repo ? `/${repo}/` : undefined;
}

export default {
  ssr: false,
  basename: getBasePath() ?? "/",
} satisfies Config;
