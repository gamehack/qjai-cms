# Third-party dependencies and license review

The project uses a pinned pnpm lockfile. Dependency versions and transitive dependencies can change only through reviewed dependency updates.

## Generate the inventory

After installing dependencies, generate the production dependency license inventory:

```sh
pnpm install --frozen-lockfile
pnpm licenses list --prod
```

The current audited inventory includes MIT, Apache-2.0, BSD, ISC, BlueOak, CC-BY-4.0, Python-2.0, 0BSD and WTFPL packages. See [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) for the non-MIT and attribution-bearing packages identified in the current lockfile.

The current MVP does not use media uploads or image processing. The optional Next.js `sharp` dependency is excluded through a pnpm override, avoiding unused prebuilt libvips binaries and their LGPL/MPL licensing obligations. If media processing is introduced, reassess the dependency and its redistribution obligations before enabling it.

Review the complete generated output before each public release. Confirm that every production dependency's license is compatible with the intended distribution and commercial use. Record exceptions and obtain legal review where a package has a non-standard, source-available, reciprocal or unclear license.

## Security audit

Run:

```sh
pnpm audit --prod --audit-level high
```

The CI workflow runs this check on pushes and pull requests. The current lockfile also overrides vulnerable transitive versions of DOMPurify and Happy DOM with patched versions. An audit result is time-dependent; rerun it before releases.

## Policy

- Prefer actively maintained dependencies with clear open-source licenses.
- Avoid adding dependencies for functionality that can be implemented safely with the platform APIs already in use.
- Review license changes when upgrading a dependency.
- Do not copy third-party source code or assets into this repository without checking their license and attribution requirements.
- A passing automated audit is not a substitute for a human license review.
