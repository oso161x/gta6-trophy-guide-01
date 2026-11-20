# GTA VI Trophy Guide

[![make.fun](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?ref=4s86eynw)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/oso161x/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01?ref=4s86eynw)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/oso161x/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?ref=4s86eynw)

A free, offline guide and tracker for the **55 PlayStation 5 trophies of Grand Theft Auto VI** — the official list (1 platinum, 2 gold, 6 silver, 46 bronze), a checklist saved in your browser, a roadmap to the platinum, the one possibly missable trophy flagged, and a guide in the maker's own words for every trophy, with its sources cited beside it.

Built for the [make.fun bounty gta6-trophy-guide-01](https://make.fun/bounty/gta6-trophy-guide-01?ref=4s86eynw).

## What it does

- **Tracker** — tick trophies off and they stay ticked (localStorage). Export your progress as JSON, import it back, reset when you start over. Filters by kind (story, missable, collectibles, activities, online) and by grade, plus search and an earned-only view.
- **Roadmap to the platinum** — three steps, about 200 hours, one playthrough: story first (60–80h), then the 100% checklist (about 100h), then the stranger strands and cleanup (about 10h). Save advice included: no mission replay, so keep a save at the start and end of each chapter.
- **Missable flag** — only one trophy may be missable: Positive Mental Attitude, the Chapter 1 balcony meditation. The guide tells you exactly when it comes up.
- **Spoiler setting** — hides story trophy names and descriptions until you earn them.
- **Cited guides** — every guide is written in the maker's own words and names its sources (PowerPyx, GTABase, Exophase, PSNProfiles, sixshore). Five guides are marked unconfirmed where the guide writers have not pinned the method down yet.
- **Offline** — a static web app. It fetches nothing over the network; open `app/index.html` in a desktop browser and it just works.

## Run it

Serve `app/` and open it in a browser:

```sh
node serve.ts
# open http://localhost:8080
```

Or open `app/index.html` directly from the files. No build step, no dependencies.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` checks the entry first (55 trophies with guides and sources, grades splitting 1/2/6/46, 28 hidden, the one missable trophy, 3–4 screenshots under 256 KiB, no network references), then copies `app/` and `screenshots/` to the output directory and writes `dossier.json`. It refuses a dossier over the 1.5 MiB cap. `node main.ts --help` prints the usage; `--verbose` narrates each check; `--out <dir>` picks the output directory.

## Sources

Official trophy names, descriptions and grades as PlayStation publishes them (Exophase and PSNProfiles agree on every entry). Guide detail draws on PowerPyx's trophy guide & roadmap and 100% completion checklist, GTABase's trophy list, and sixshore's trophy list & roadmap — cited beside each guide, never copied.

An unofficial, fan-made tracker. Grand Theft Auto and Rockstar Games are trademarks of their owners; no Rockstar logo, artwork or game imagery is used here.
