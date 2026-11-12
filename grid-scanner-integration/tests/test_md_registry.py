"""Moldova (draft country): the curated files load, stay draft, and describe the south the BESS screen needs."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import yaml

from scanner.core.methods import parse_card
from scanner.core.registry import EntitiesFile, load_countries, load_market_rules, load_snapshots, rule_at

ROOT = Path(__file__).resolve().parents[1]


def _entities() -> EntitiesFile:
    return EntitiesFile(**yaml.safe_load((ROOT / "registry" / "entities" / "md" / "entities.yaml").read_text()))


def test_country_is_draft_single_zone_with_unverified_eic() -> None:
    md = load_countries(ROOT)["md"]
    assert md.status == "draft"
    assert md.timezone == "Europe/Chisinau"
    assert [z.id for z in md.zones] == ["md.zone.md"]
    # Until checked against ENTSO-E's list, the base tier must not pick the zone up.
    assert md.zones[0].eic_verified is False


def test_market_rules_are_unverified_and_dated() -> None:
    rules = load_market_rules(ROOT)["md"]
    assert rules.rules and not any(r.verified for r in rules.rules)
    assert all(r.source for r in rules.rules)
    storage = rule_at(rules, "support_scheme.storage_requirement", date(2026, 11, 12), "md.zone.md")
    assert storage is not None and storage.value["min_mwh_per_mw"] == 0.25
    assert rule_at(rules, "support_scheme.storage_requirement", date(2025, 12, 1), "md.zone.md") is None


def test_entities_hang_off_the_zone_and_flag_the_transnistrian_region() -> None:
    entities = {e.id: e for e in _entities().entities}
    assert all(e.parent == "md.zone.md" and e.kind == "substation" for e in entities.values())
    flagged = {e.id for e in entities.values() if e.attributes.get("territory") == "transnistrian_region"}
    assert flagged == {"md.substation.mgres", "md.substation.ribnita", "md.substation.bender_centru"}
    # Every entity states which side it is on: the BESS screen reads this attribute.
    assert all(e.attributes.get("territory") in ("right_bank", "transnistrian_region") for e in entities.values())
    assert 400 in entities["md.substation.vulcanesti"].attributes["voltage_kv"]


def test_snapshots_capture_the_register_and_research_its_index() -> None:
    snaps = {s.id: s for s in load_snapshots(ROOT) if s.id.startswith("md.")}
    edition = snaps["md.moldelectrica.connection_permits.edition_2026_08_14"]
    assert (edition.kind, edition.status, edition.timezone) == ("pdf", "active", "Europe/Chisinau")
    assert snaps["md.moldelectrica.connection_permits.page"].status == "to_research"
    assert snaps["md.opem.dam_results"].status == "to_research"


def test_south_bess_method_card_parses() -> None:
    path = ROOT / "docs" / "methods" / "md_south_bess_screen.md"
    card = parse_card(path.read_text())
    assert card.id == path.stem and card.status == "provisional" and card.parameters == []
