# eto.news

*The flagship paper. Each story. Every side.*

This repository is a **paper**: a directory the press visits each morning.
It holds the editorial line (`sources.toml`), the nameplate and plumbing
(`eto.toml`), the model lock (`models.lock.json`), the append-only archive
(`archive/`), the rendered newsstand (`site/`), the subscribe functions
(`functions/`), and the journal's diffable exports (`db/exports/`). The
journal itself (`db/`) and the logs stay on the editor's machine.

The press — the machinery that prints it — is a dependency:
[`@eto-press/press`](https://github.com/KhalidAdan/eto-press), consumed
like any other paper would. Nothing in this repository is press code.

## The morning

`run-eto.ps1` is the paperboy: a Task Scheduler job (`eto-morning-edition`)
runs it at 5:30 with hourly retries until 11:30, and at logon. It prints
(`npm run dev`), renders (`npm run render`), exports the journal
(`npm run export`), commits and pushes the edition — which deploys `site/`
to eto.news through `.github/workflows/deploy.yml` — then emails it
(`npm run email`) and takes the backups. Every step resumes from the
journal; firing it twice is safe.

## The editor's verbs

| command | what it does |
|---|---|
| `npm run dev` | print today's edition (the whole pipeline) |
| `npm run render` | render the site from the journal into `site/` |
| `npm run email` | deliver the latest edition to the reader list (`-- --test <addr>` to one address) |
| `npm run correct -- <edition> <rank> "<note>"` | print a dated correction in the next edition; the archive is never touched |
| `npm run export` | the journal's durable tables as JSONL in `db/exports/` |
| `npm run backup` / `npm run backup:readers` | snapshot the journal / the reader list |

Model-related upkeep (`status`, `pull`, `pin`), the doctor, and the
scheduler live in `@eto-press/cli` (`npx @eto-press/cli <verb>` from this
directory).

## Documents

The constitution is [docs/NORTH-STAR.md](docs/NORTH-STAR.md). How the paper
reaches its readers is [docs/DEPLOY.md](docs/DEPLOY.md). The pipeline, the
roadmap, the models primer, the source audit and the experiments are the
press's documents now — see [docs/README.md](docs/README.md) for where.
