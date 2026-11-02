# Third-party notices

The MIT license in `LICENSE` applies to original project code. Dependencies retain their own licenses. The production dependency inventory is generated from the committed lockfile with:

```sh
pnpm licenses list --prod
```

The following non-MIT or attribution-bearing dependencies were present in the audited production dependency inventory for this release candidate. Versions must be rechecked whenever the lockfile changes.

| Package | Version | License | Notice / handling |
|---|---:|---|---|
| `caniuse-lite` | 1.0.30001820 | CC-BY-4.0 | Includes browser-compatibility data from caniuse.com, via caniuse-lite. Source: https://github.com/browserslist/caniuse-lite |
| `dompurify` | 3.4.17 | MPL-2.0 OR Apache-2.0 | Dual-licensed; the Apache-2.0 option is available. Source: https://github.com/cure53/DOMPurify |
| `utf8-byte-length` | 1.0.5 | WTFPL OR MIT | Dual-licensed; the MIT option is available. |
| `sanitize-filename` | 1.6.3 | WTFPL OR ISC | Dual-licensed; the ISC option is available. |
| `truncate-utf8-bytes` | 1.0.2 | WTFPL | Retain the upstream license notice when redistributing the package. |
| `argparse` | 2.0.1 | Python-2.0 | Retain the upstream license notice. |
| `tslib` | 2.9.1 | 0BSD | Retain the upstream notice where supplied. |
| `sax` | 1.6.1 | BlueOak-1.0.0 | Retain the upstream license notice. |

The dependency tree also contains packages under MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause and ISC licenses. Consult the generated inventory for the complete package list and exact versions.

## Optional image processing

The current MVP does not implement media uploads or image processing. Next.js declares `sharp` as an optional dependency, but this project excludes it with a pnpm override to avoid pulling in unused prebuilt libvips binaries and their LGPL/MPL third-party licensing obligations. If image processing is added later, remove that override only after a fresh dependency-license review and the required notices/source compliance work.

This file is an attribution aid, not legal advice. Review upstream license texts and package contents before distributing application or container images.
