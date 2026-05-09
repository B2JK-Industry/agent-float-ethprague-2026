// Canonical GitHub user / repo / contents response shapes for MSW fixturing.
// Source: packages/evidence/src/sources/github/fetch.ts (DEFAULT_BASE).
//
// US-114 narrowed scope: /users/{owner}, top-20 /users/{owner}/repos,
// per-repo /repos/{o}/{r}, README + LICENSE contents, test-dir probes.

export const githubUserOk = (owner: string) =>
    ({
        login: owner,
        id: 1,
        type: "Organization" as const,
        site_admin: false,
        public_repos: 12,
        public_gists: 0,
        followers: 50,
        following: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2026-05-09T00:00:00Z",
    }) satisfies Record<string, unknown>;

export const githubRepoOk = (owner: string, name: string) =>
    ({
        id: 1,
        name,
        full_name: `${owner}/${name}`,
        owner: { login: owner },
        private: false,
        fork: false,
        archived: false,
        disabled: false,
        pushed_at: "2026-05-09T00:00:00Z",
        updated_at: "2026-05-09T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        stargazers_count: 5,
        language: "TypeScript",
        license: { key: "mit", name: "MIT License", spdx_id: "MIT" },
    }) satisfies Record<string, unknown>;

export const githubReposListOk = (owner: string) => [
    githubRepoOk(owner, "upgrade-siren"),
    githubRepoOk(owner, "siren-agent"),
] as const;

export const githubContentReadme = {
    name: "README.md",
    path: "README.md",
    type: "file" as const,
    size: 1024,
    encoding: "base64" as const,
    content: Buffer.from("# Test\n\nHarness fixture.\n", "utf8").toString("base64"),
};
