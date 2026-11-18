## Development servers

- Always use Portly (`portly ...`) to start, stop, restart, inspect, or keep local development servers running.
- Start with `portly status`. Use `portly status --details` only for the full inventory and metrics, and `--json` only for machine-readable fields. Reuse a healthy managed server; if an in-scope server is running outside Portly, register it and use `portly take-over <project/server> --json`.
- For long-lived or reusable work, create a project and server.
- For builds, tests, code generation, previews, demos, and other bounded one-off work, run `job_id="$(portly temp '<command>' --path <folder> --timeout 30m)"`, then `portly wait "$job_id"`. `temp` returns immediately with an ID; `wait` prints captured logs and exits with the command's real code. A timeout kills the whole process group and exits with code `124`.
- Never launch persistent development servers directly, in the background, or through another supervisor.

## Work tracking

- Linear team `ANT` is the source of truth for delivery tracking. Create or locate the Linear issue before implementing a story, and avoid duplicate issues.
- Link every repository plan to its Linear identifier with a `linear:` frontmatter field.
- Keep Linear status aligned with evidence: Backlog before validation, In Progress during implementation, In Review while a required gate is open, and Done only after every acceptance criterion and delivery gate passes.
- Record concise test evidence and blockers in Linear. Never copy credentials, tokens, customer data, or other secrets into an issue.
- Keep the repository plan and Linear issue synchronized when scope, status, risks, or validation evidence changes.
