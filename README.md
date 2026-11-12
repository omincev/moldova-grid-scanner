# Moldova Grid Scanner

A grid-opportunity scan of Moldova from public data, built to assess whether battery storage (BESS) can work in southern Moldova. It works like the Danish grid scanner: every figure has a source, and missing data stays missing.

- `site/index.html`: the scanner page, one self-contained file. Open it in a browser.
- `data/moldelectrica_permits_2026-08-14.psv`: Moldelectrica's register of grid-connection permits, edition 14.08.2026, transcribed (78 permits, 1,175.9 MW, pipe-separated).
- `build/`: rebuilds `site/index.html` from the register and `template.html` (`cd build && npm install && npm run build`).
- `grid-scanner-integration/`: the files to add Moldova to the grid-scanner repository as a draft country. That means the country file, market rules, substations, snapshot entries, source dossiers, the method card for the southern BESS screen, and a test, in the same paths as in that repository. They contain no grid-scanner code.

## Southern Moldova: BESS feasibility

South here means Ștefan Vodă, Căușeni, Cimișlia, Leova and Ceadîr-Lunga, the southern raions with permits. Cahul, Vulcănești, Comrat, Taraclia, Basarabeasca and Cantemir have none.

| | |
|---|---|
| Permitted in the south | 539.2 MW, 26 permits (46% of the register), all solar or wind |
| Solar/wind with no storage attached | 367.9 MW |
| Standalone storage queued in the south | 0 MW (84 MW elsewhere) |
| Connected through lines to MGRES or Bender | 345.5 MW (64%); Ștefan Vodă 269.5 of 328.9 MW |

**Candidate sites**

1. **Vulcănești 400 kV.** It has had two 400 kV links since 8 Nov 2026 (Isaccea and Chișinău), and nothing is queued nearby. It suits a battery selling balancing services. Open questions: whether there is a 110 kV or MV level to connect to, and how much capacity is free.
2. **Cimișlia and western Căușeni.** About 120 MW of wind with no storage connects entirely on the right bank (Chișinău–Gura Galbenei and Taraclia Nord–Basarabeasca 110 kV). This is the best target for a co-located battery.
3. **Ștefan Vodă.** The largest wind cluster, but 82% of its permitted MW taps 110 kV lines from MGRES, which has not supplied the right bank since 1 Jan 2025. Clear that dependency with Moldelectrica before building a revenue case.

**Economics.** Day-ahead arbitrage is worth about €38k–103k per MW per year for a 2-hour battery. That is an upper bound with perfect foresight, built from the reported seasonal price ranges. At about €1M per MW capex (Tetra Tech for the Energy Community Secretariat, May 2025), the simple payback is 10–27 years. A southern battery therefore needs balancing revenue (aFRR/mFRR) or a wind partner bound by the auction's storage rule of at least 0.25 MWh per MW.

**Limits.** The register covers permits Moldelectrica issued, not the DSOs' permits. A permit is not a project. No hosting capacity is published. The MGRES/Bender flag is a text rule on the connection point, not an assessment of whether the line can operate. Prices are reported ranges until OPEM or ENTSO-E prices are loaded.

## Sources

- Moldelectrica, Registrul de evidență a avizelor de racordare, 14.08.2026: https://rdp.moldelectrica.md/files/docs/14/Registrul%20de%20evidenta%20AR_14.08.2026.pdf
- Tetra Tech for the Energy Community Secretariat, RES and BESS integration, Deliverable 4 (30 May 2025): https://energie.gov.md/sites/default/files/document/attachments/deliverable_4-_res_and_bess_integration_report_final.pdf
- Ministry of Energy, infrastructure project status, 14.07.2026: https://energie.gov.md/sites/default/files/stadiul_proiectelorprogramelor_de_infrastructura_ale_men_-actualizare_14.07.2026.pdf
- WatchDog.MD, Research on renewable energy in Moldova (June 2026): https://watchdog.md/wp-content/uploads/2026/07/Research-on-renewable-energy-in-Moldova-WatchDog.MD_.pdf
- ANRE, market monitoring Q2 2026: https://anre.md/storage/upload/administration/reports/1656/MP%20trim%20II%202026.pdf
- IPN, Cuciurgan stops supplying the right bank: https://www.old.ipn.md/en/cuciurgan-power-plant-stops-delivering-energy-to-the-right-bank-7966_1110346.html
- Romania Insider, Vulcănești–Chișinău line energized: https://www.romania-insider.com/republic-moldova-powers-up-new-electricity-link-romania
- Interfax, wind and storage auction (14 Aug 2026): https://interfax.com/newsroom/top-stories/118722/

The full source list with page references is at the bottom of `site/index.html`. This is not investment advice.
