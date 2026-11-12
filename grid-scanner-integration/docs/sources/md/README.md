# Moldova sources

Owner: to be named. Draft country (`registry/countries/md.yaml`). First use case: screening battery storage (BESS) sites in southern Moldova (`docs/methods/md_south_bess_screen.md`).

## How Moldova differs from Denmark

- **One bidding zone, MD.** Synchronous with Continental Europe since March 2022. Moldelectrica is the TSO. The distribution operators are Premier Energy Distribution (centre and south) and RED Nord (north).
- **No capacity map.** There is nothing like BEK 1468/2025 §29: no free, limited or no-capacity figure per station. The only substation-level public signal is Moldelectrica's register of connection permits (dossier below). It covers permits Moldelectrica issued, including 10 kV cells in its own 110/10 kV substations, but not the permits issued by the DSOs.
- **Imports set the price.** Romania supplied 48.8% of Q2 2026 procurement and Ukraine 7.1% (ANRE). OPEM's day-ahead market has run since December 2025 but is not coupled.
- **The Transnistrian region.** MGRES (Cuciurgan, 2,520 MW) has not supplied the right bank since 1 Jan 2025. Several 110 kV lines in the south-east start at MGRES or end in Bender. Permits connected through them carry a dependency that the BESS screen reports.

## Inventory

| Source | What | Access | Phase | Status |
|---|---|---|---|---|
| Moldelectrica, register of connection permits (Registrul de evidență a avizelor de racordare) | Each permit: connection point (substation cell or 110/35 kV line tap), technology including storage, MW, holder, validity, flexible-conditions flag | PDF, about half-yearly editions | MD-1 | dossier (`moldelectrica-connection-permits.md`); edition 14.08.2026 snapshot added |
| ENTSO-E Transparency, BZN MD | load, generation, cross-border flows, prices if published | API (token) | MD-1 | blocked on `eic_verified` in `md.yaml`; coverage for MD to check |
| OPEM, PZU-MD day-ahead results | prices and volumes, since Dec 2025 | WEB (to research) | MD-1 | planned (`md.opem.dam_results`, to_research) |
| Moldelectrica, imbalance prices | monthly imbalance prices | WEB with linked files | MD-1 | snapshot of the index page added |
| Moldelectrica, balancing services auctions (LASE) | aFRR/mFRR procurement results | PDF | MD-2 | planned |
| ANRE, quarterly market monitoring | supply mix, wholesale and retail prices, prosumers | PDF | MD-2 | planned (claims) |
| Ministry of Energy, infrastructure project status | 400 kV projects, substation works, auctions | PDF, about quarterly | MD-2 | planned (watched document) |
| Moldelectrica, Transmission Network Development Plan | backbone, interconnectors, regional RES targets | PDF | MD-2 | read for `registry/entities/md/`; 2018–2027 edition is the latest found |
| Tetra Tech for the Energy Community Secretariat (30 May 2025), RES and BESS integration, Deliverable 4 | system-level BESS sizing for reserves, spillage, capex assumption | PDF | MD-2 | read; no node-level data |
| Premier Energy Distribution, RED Nord | DSO connection permits by location | ASK | MD-2 | planned (Ministry of Energy gives totals only: 329 MW and 96.4 MW, Jul 2025) |
