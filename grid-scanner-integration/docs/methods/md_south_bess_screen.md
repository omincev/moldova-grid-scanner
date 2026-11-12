---
id: md_south_bess_screen
version: 1
title: Southern Moldova BESS site screen
status: provisional
owner: [oleg, misi]
inputs: [connection_queue.applied_mw, md.substation entities (registry/entities/md), day_ahead_price]
parameters: []
outputs: [per south substation and raion - permitted MW, storage gap MW, transnistrian-region dependency MW, nearest 400 kV node]
known_biases:
  - TSO-issued permits only; DSO permits in the south (Premier Energy) are missing, so storage gaps are lower bounds.
  - A permit is not a project; under 10% of permitted MW is commissioned per year (Ministry of Energy).
  - Storage size is not published for combined permits; a combined permit counts as storage-covered whatever its storage size.
  - The transnistrian-region flag is a text rule on the connection point, not an assessment of whether the line can operate.
  - No hosting capacity is published; nothing here says a substation can take another MW.
  - Price spread comes from reported seasonal ranges until OPEM or ENTSO-E MD prices are ingested.
---

Specification only. No code implements this card yet. It describes what the screen computes, so the owner can sign it off before a feature is built (`docs/features.md`, "spec before code"). The static Moldova scanner page computes the same figures in the browser from edition 14.08.2026 of the register.

**Question.** Where in southern Moldova (raions Ștefan Vodă, Căușeni, Cimișlia, Leova, Basarabeasca, Cantemir, Cahul, Taraclia, and UTA Găgăuzia) could a battery connect and earn money, and what stands in the way?

**Per permit**, from the register (`docs/sources/md/moldelectrica-connection-permits.md`):
- technology flags: solar, wind, storage, thermal;
- `storage_covered`: the type includes Stocare;
- `via_transnistrian_region`: the connection point names MGRES, CERS Moldovenească, Bender or Rîbnița;
- `flexible`: issued under flexible conditions;
- `expired_on_run_date`: the latest validity date has passed. The permit is flagged, not dropped.

**Per raion and per named substation**, sums of permitted MW:
- `permitted_mw`: all permits;
- `storage_gap_mw`: solar and wind permits without storage. This is the surplus a co-located or nearby battery could absorb;
- `standalone_storage_mw`: storage-only permits, the direct competition;
- `transnistrian_dependency_mw`: permitted MW whose connection runs through a substation in the Transnistrian region.

**Per raion**, the straight-line km from the raion seat to the nearest 400 kV node on the right bank (Vulcănești, and Chișinău since 2026-11-08). Rîbnița and MGRES are excluded.

**Outcome labels**, applied in order:
1. `node_bess`: within 30 km of Vulcănești or Chișinău 400 kV. Candidate for a grid-scale battery selling balancing services. The next step is a connection study with Moldelectrica.
2. `co_located_bess`: `storage_gap_mw` ≥ 20 and less than half of it depends on the Transnistrian region. Candidate for a battery beside existing or permitted wind.
3. `co_located_bess_with_dependency`: as 2, but half or more depends on the Transnistrian region. The connection risk must be cleared with Moldelectrica before any revenue case.
4. `no_signal`: nothing queued. Hosting capacity is unknown, not free.

**Revenue range.** For each label, the BESS v0 arbitrage bound (`bess_v0_daily_lp_day_ahead`) is computed once Moldovan prices are ingested. Until then the page shows the seasonal-range bound. Balancing revenue is the main case in Moldova: about 162 MW of upward FRR is needed for 1,261 MW of variable renewables (Tetra Tech for the Energy Community Secretariat, 2025), and a 246 MW aFRR/mFRR storage tender was planned. It enters once the balancing auction results are ingested.
