# The paper's documents

These documents are this paper's own:

- **[NORTH-STAR.md](NORTH-STAR.md)** — the paper's constitution: the
  standards every section keeps. The press's copy is the same text; this
  one is the paper's. Since 2026-09-26 the paper is sections, and each
  section has a document of its own weight:
  - **[sections/brief.md](sections/brief.md)** — the Current events brief's
    constitution: the founding North Star, moved here unchanged. Where the
    code says *NORTH-STAR §n*, it means this document's numbering.
  - **[sections/business.md](sections/business.md)**,
    **[sections/sports.md](sections/sports.md)**,
    **[sections/blogs.md](sections/blogs.md)** — desk notes: what each
    desk is, what it is not, what the editor may change without ceremony.
    None of the three prints yet; they arrive with press generation 3
    (the proposal is `eto-press/docs/PROPOSAL-SECTIONS.md`).
- **[DEPLOY.md](DEPLOY.md)** — how eto.news reaches its readers: the
  paperboy, GitHub as the loading dock, Cloudflare Pages as the newsstand.

Everything that describes the *press* moved with the press on 2026-08-13
and is maintained there, in
[KhalidAdan/eto-press](https://github.com/KhalidAdan/eto-press):

| was here | now lives at |
|---|---|
| `docs/PIPELINE.md` | `eto-press/docs/PIPELINE.md` — the stages, the tables, the error catalog |
| `docs/ROADMAP.md` | `eto-press/docs/ROADMAP.md` — the plan, and what shipped when |
| `docs/models-primer.md` | `eto-press/docs/models-primer.md` — the judge, the compositor, the lock |
| `docs/SOURCES.md` | `eto-press/docs/SOURCES.md` — the audited shelf `sources.toml` was seeded from |
| `lab/` | `eto-press/packages/press/lab/` — the audition and audit scripts |

The copies that used to sit here stopped being maintained the day the press
moved out and were removed on 2026-09-26, together with the pre-monorepo
`src/` and `test/` (the press has carried the current versions of every one
of those files since August). The `experiments/` records are historical and
identical in both places.

The operator documentation — installing a paper, the CLI, configuration,
troubleshooting — is the press's documentation site (`docs-site/` in that
repository).
