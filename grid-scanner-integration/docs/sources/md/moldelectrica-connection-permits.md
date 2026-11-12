# Source dossier: Moldelectrica register of connection permits

Status: draft. Country: md. Owner: to be named. Last verified: 2026-11-12, against the text of edition 14.08.2026 (read through a web fetch; the PDF bytes are not yet in the raw store).

## What it is

Moldelectrica, the Moldovan TSO, publishes a register of the grid-connection permits (avize de racordare) it has issued and that are still valid: *Registrul de evidență a avizelor de racordare*. Each row is one permit for one power plant or storage installation, with its connection point. Moldova has no capacity map, so this is the only public substation-level view of how much capacity is waiting to connect.

Used by: the southern BESS screen (`docs/methods/md_south_bess_screen.md`). Later, a Moldovan counterpart to F6 (renewable pipeline per municipality) and to the saturation part of F7.

## Access

- Method: PDF, one file per edition.
- URL of edition 14.08.2026: https://rdp.moldelectrica.md/files/docs/14/Registrul%20de%20evidenta%20AR_14.08.2026.pdf. The same file is mirrored under `mail.moldelectrica.md`. Edition 09.02.2026: `.../files/docs/14/Registrul de evidenta AR_09.02.2026.pdf`.
- Authentication: none.
- Index page: not found yet (snapshot `md.moldelectrica.connection_permits.page`, to_research).
- How it was found: web search for the register title, 2026-11-12. The factory sandbox gets a proxy 403 on moldelectrica.md, so the first byte-level copy will be the runtime snapshot `md.moldelectrica.connection_permits.edition_2026_08_14`.

## Datasets

One table of 78 rows (edition 14.08.2026). Columns, in the register's order:

- Nr: running number. Not a stable permit ID: rows 57 and 58 are out of date order.
- Data eliberării: issue date, DD.MM.YY or DD.MM.YYYY. Both forms occur.
- Termen de valabilitate: validity end.
- Prelungit (Da/Nu): extended or not, followed by the extended end date. Some cells hold two dates. The later one is the one in force, sometimes with a reference such as "HG nr.494/2025, Anexa nr.7".
- Locul amplasării: site, as village and raion (r-nul / r-l), mun. or or.
- Punctul de racordare: connection point. Either a cell in an existing substation ("celula ... din SE Cioburciu 110/10 kV"), a new 110/35 kV line tap ("SE proprie, derivatie LEA 110 kV MGRES - Cioburciu 2"), or a line loop-in ("intrare-iesire LEA ...").
- Tipul centralei: Solară, Eoliană, Fotovoltaică, Stocare, Instalație de stocare a energiei electrice, Cogenerare, Motoare cu ardere internă, and combinations separated by "/".
- Puterea, MW: permitted capacity. The register gives one figure per permit. Storage size in MW or MWh is **not** given separately for combined permits.
- Solicitant: holder (company).
- Notes: court suspension ("Suspendat prin încheiere judecătorească", row 16), flexible conditions ("condiții flexibile", from 28.01.2026), "zero extragere" (row 77).

Edition 14.08.2026 totals: 78 permits, 1,175.9 MW. South (Ștefan Vodă, Căușeni, Cimișlia, Leova, Ceadîr-Lunga): 26 permits, 539.2 MW, all solar or wind. 367.9 MW of that has no storage in its type, and none is standalone storage.

## Backfill

No history through an API. Each edition is a separate PDF. Editions 09.02.2026 and 14.08.2026 are known, and earlier ones may exist under the same folder. Backfill means capturing every edition that can be found, once each, then loading them as claims (one document per edition). Expired permits drop out of later editions, so history only exists in editions we capture. That is why the snapshot ships before the parser.

## Decisions

Proposed. None is implemented in code yet, and all need the owner's sign-off.

- **Entity of a permit.** A permit is not an entity. Its connection point is. Cells in a named substation map to `md.substation.<slug>` (`registry/entities/md/entities.yaml`). Line taps map to the line's two end substations, recorded in the claim's `location`. The raion goes to the claim's location as text until district entities exist.
- **MW.** Kept as published, as the permitted connection capacity. No split of combined permits between technologies, and no storage MW invented for "X/Stocare" rows. Storage is a yes/no flag on those rows.
- **Validity.** The validity end in force is the latest date in the validity and extension columns. Permits past that date on the run date are flagged, not dropped, because the register is a snapshot and a later extension may not be in it yet.
- **Dates.** DD.MM.YY is read as 20YY. Dates are local days and carry no time.
- **Left-bank dependency.** A permit is flagged `via_transnistrian_region` when its connection point names MGRES, CERS Moldovenească, Bender or Rîbnița. This is a text rule on the published connection point (entities with `territory: transnistrian_region`). It says nothing about whether the line is operable.
- **Flexible conditions.** Kept as a flag from the notes column. The conditions themselves are not in the register.

## Licence and terms

No licence statement found. It is a public register of a state enterprise. Use with attribution, and ask Moldelectrica before redistributing in a paid product.

## Measured or estimated

Published directly: permitted MW, connection point, technology, validity. Not published: hosting capacity, utilisation of the substations, storage MWh, the probability that a permit is built. The Ministry of Energy says under 10% of permitted capacity is commissioned each year.

## Sensitivity

public.

## Codebook entries needed

- `md.moldelectrica.connection_permits.permitted_mw`, equivalence class `connection_queue.applied_mw` (the same class as Energinet's queue, read as "capacity waiting to connect"). Dimensions: technology flags, storage flag, flexible flag. To be added with the parser.

## Risks

- Layout changes between editions. ADR 0009 applies: parser first, LLM fallback with citation check.
- The register covers TSO-issued permits only. DSO permits (Premier Energy 329 MW, RED Nord 96.4 MW, July 2025) are missing.
- Permit counts overstate what gets built. 30 permits (109 MW) were handed back in H1 2025 alone.
