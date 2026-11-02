# Security Policy

## Supported versions

Security fixes are currently provided for the latest code on the default branch. This project is in Alpha; no long-term support guarantees are made.

## Reporting a vulnerability

Please do not disclose suspected vulnerabilities in public issues, discussions, pull requests or social posts.

Use GitHub's **Report a vulnerability** feature in the repository's Security tab (private vulnerability reporting / security advisories) when it is enabled. If that feature is unavailable, contact the repository maintainer privately through GitHub before sharing technical details.

Include the affected version or commit, impact, reproduction steps and any suggested mitigation. Do not include real user data, credentials or tokens in a report.

## Credential handling

- Never commit production secrets, database URLs, API keys, access tokens or private certificates.
- If a credential is exposed, revoke or rotate it immediately; deleting the file or rewriting Git history does not invalidate a credential.
- Keep runtime and migration database credentials separate.
- Do not expose the ingestion bearer token to browser code.
