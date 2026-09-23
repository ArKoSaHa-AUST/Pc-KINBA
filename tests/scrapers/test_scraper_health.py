import pytest
import os
import sys
import datetime
from unittest.mock import MagicMock, patch

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from scrapers.fast_scrapers import ScrapeResult
from scrapers.health import (
    evaluate_store_health,
    record_run,
    check_store_liveness,
    calculate_rolling_median,
    CONSECUTIVE_FAILURES_TO_ALERT,
    LOW_YIELD_RATIO,
    ALERT_COOLDOWN_HOURS,
    UNKNOWN_THRESHOLD_HOURS,
)


def make_scrape_result(
    store_id: str,
    ok: bool,
    item_count: int = 10,
    priced_count: int = 10,
    failure_reason: str = None,
    query: str = "rtx 4060"
) -> ScrapeResult:
    return ScrapeResult(
        store_id=store_id,
        query=query,
        ok=ok,
        items=[{"title": f"Item {i}", "price": 45000 if i < priced_count else 0, "product_url": "https://example.com"} for i in range(item_count)],
        item_count=item_count,
        priced_count=priced_count,
        unpriced_count=item_count - priced_count,
        http_status=200 if ok else (500 if failure_reason == "http_error" else 200),
        duration_ms=150,
        container_matched=ok or (failure_reason != "container_missing"),
        failure_reason=failure_reason,
        sample_titles=[f"Item {i}" for i in range(min(3, item_count))]
    )


def test_health_001_three_consecutive_failures_transitions_to_broken_and_alerts():
    """
    HEALTH-001: 3 consecutive container_missing runs transition the store to 'broken'
    and fire exactly one alert.
    """
    store_id = "skyland"
    fail_res = [make_scrape_result(store_id, ok=False, item_count=0, priced_count=0, failure_reason="container_missing")]

    with patch("scrapers.health.emit_alert") as mock_alert:
        # Run 1: Failure 1 -> Degraded, no broken alert
        h1 = evaluate_store_health(store_id, fail_res, prior_health=None)
        assert h1["status"] == "degraded"
        assert h1["consecutive_failures"] == 1
        assert mock_alert.call_count == 0

        # Run 2: Failure 2 -> Degraded, no broken alert
        h2 = evaluate_store_health(store_id, fail_res, prior_health=h1)
        assert h2["status"] == "degraded"
        assert h2["consecutive_failures"] == 2
        assert mock_alert.call_count == 0

        # Run 3: Failure 3 -> BROKEN, alert triggered once
        h3 = evaluate_store_health(store_id, fail_res, prior_health=h2)
        assert h3["status"] == "broken"
        assert h3["consecutive_failures"] == 3
        assert h3["alerted_at"] is not None
        assert mock_alert.call_count == 1
        mock_alert.assert_called_with(store_id, "Skyland BD", "broken", "container_missing", 3)


def test_health_002_fourth_failure_does_not_realert_cooldown_honored():
    """
    HEALTH-002: A 4th consecutive failure within cooldown does not re-alert.
    """
    store_id = "skyland"
    fail_res = [make_scrape_result(store_id, ok=False, item_count=0, priced_count=0, failure_reason="container_missing")]

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    prior_broken = {
        "store_id": store_id,
        "display_name": "Skyland BD",
        "status": "broken",
        "consecutive_failures": 3,
        "last_failure_at": now_iso,
        "last_failure_reason": "container_missing",
        "baseline_item_count": 10.0,
        "alerted_at": now_iso,  # Recently alerted
        "updated_at": now_iso
    }

    with patch("scrapers.health.emit_alert") as mock_alert:
        h4 = evaluate_store_health(store_id, fail_res, prior_health=prior_broken)
        assert h4["status"] == "broken"
        assert h4["consecutive_failures"] == 4
        # Alert cooldown (24h) active -> no new alert emitted
        assert mock_alert.call_count == 0


def test_health_003_recovery_resets_failures_and_fires_recovery_alert():
    """
    HEALTH-003: A successful run on a broken store resets consecutive_failures to 0
    and fires a recovery alert.
    """
    store_id = "techland"
    success_res = [make_scrape_result(store_id, ok=True, item_count=15, priced_count=15)]

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    prior_broken = {
        "store_id": store_id,
        "display_name": "Techland BD",
        "status": "broken",
        "consecutive_failures": 5,
        "last_failure_at": now_iso,
        "last_failure_reason": "container_missing",
        "baseline_item_count": 15.0,
        "alerted_at": now_iso,
        "updated_at": now_iso
    }

    with patch("scrapers.health.emit_alert") as mock_alert:
        h_rec = evaluate_store_health(store_id, success_res, prior_health=prior_broken)
        assert h_rec["status"] == "healthy"
        assert h_rec["consecutive_failures"] == 0
        assert h_rec["alerted_at"] is None
        assert mock_alert.call_count == 1
        mock_alert.assert_called_with(store_id, "Techland BD", "recovery", "recovered", 0)


def test_health_004_low_yield_relative_to_baseline_flags_degraded():
    """
    HEALTH-004: An item count at 30% of baseline flags 'degraded' even though it is non-zero.
    """
    store_id = "startech"
    # Baseline = 20.0 items. 30% of 20 = 6 items (< 40% threshold = 8 items)
    low_yield_res = [make_scrape_result(store_id, ok=True, item_count=5, priced_count=5)]

    prior_health = {
        "store_id": store_id,
        "display_name": "StarTech BD",
        "status": "healthy",
        "consecutive_failures": 0,
        "baseline_item_count": 20.0,
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    h_eval = evaluate_store_health(store_id, low_yield_res, prior_health=prior_health)
    assert h_eval["status"] == "degraded"
    assert h_eval["last_failure_reason"] == "low_yield"


def test_health_005_no_run_for_48h_yields_unknown():
    """
    HEALTH-005: No run for 48h yields 'unknown', signaling checker stall.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    stale_time = (now - datetime.timedelta(hours=50)).isoformat()

    stale_record = {
        "store_id": "globalbrand",
        "status": "healthy",
        "updated_at": stale_time
    }

    status = check_store_liveness(stale_record, now_dt=now)
    assert status == "unknown"

    fresh_time = (now - datetime.timedelta(hours=2)).isoformat()
    fresh_record = {
        "store_id": "globalbrand",
        "status": "healthy",
        "updated_at": fresh_time
    }
    assert check_store_liveness(fresh_record, now_dt=now) == "healthy"


def test_health_006_one_broken_store_does_not_prevent_others_from_recording():
    """
    HEALTH-006: One broken store does not prevent the other eleven stores from being
    evaluated, recorded, and persisted.
    """
    # 12 store results: 1 broken (skyland), 11 healthy
    results = []
    from scrapers.selectors import SELECTORS

    for sid in SELECTORS.keys():
        if sid == "skyland":
            results.append(make_scrape_result(sid, ok=False, item_count=0, priced_count=0, failure_reason="container_missing"))
        else:
            results.append(make_scrape_result(sid, ok=True, item_count=12, priced_count=12))

    summary = record_run(results, run_id="test-run-uuid-123", client=None)

    assert summary["stores_evaluated"] == 12
    assert summary["healthy_count"] == 11
    assert summary["degraded_count"] == 1  # First failure is degraded
    assert summary["broken_count"] == 0
    assert "skyland" in summary["degraded_stores"]
    assert len(summary["records"]) == 12
