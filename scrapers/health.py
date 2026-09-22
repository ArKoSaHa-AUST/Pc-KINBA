"""
PC-KINBA — Scraper Health & Breakage Evaluator

Evaluates per-store scraper health, detects silent selector breakage,
tracks rolling yield baselines, and triggers deduplicated alerts on failure/recovery.
"""

import os
import sys
import uuid
import datetime
from typing import List, Dict, Any, Optional

# Ensure scrapers module can be imported
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from scrapers.fast_scrapers import ScrapeResult
from scrapers.selectors import SELECTORS, get_selectors
from scrapers.db import (
    save_scraper_runs,
    update_scraper_health,
    get_scraper_health,
    get_recent_runs_for_store,
    supabase_client
)

# Configuration Thresholds
CONSECUTIVE_FAILURES_TO_ALERT = 3      # "several consecutive runs" per QA spec
LOW_YIELD_RATIO = 0.4                  # < 40% of baseline item count = degraded
UNPRICED_RATIO_THRESHOLD = 0.8         # > 80% items unpriced = degraded
ALERT_COOLDOWN_HOURS = 24              # minimum hours between repeat failure alerts
UNKNOWN_THRESHOLD_HOURS = 48           # no run in 48h = unknown
CANARY_QUERIES = ["rtx 4060", "ryzen 5", "ddr5 16gb", "850w psu"]


def calculate_rolling_median(numbers: List[int]) -> float:
    """Calculates median for an array of numbers."""
    if not numbers:
        return 10.0
    sorted_nums = sorted(numbers)
    n = len(sorted_nums)
    mid = n // 2
    if n % 2 != 0:
        return float(sorted_nums[mid])
    return (sorted_nums[mid - 1] + sorted_nums[mid]) / 2.0


def check_store_liveness(health_record: Dict[str, Any], now_dt: Optional[datetime.datetime] = None) -> str:
    """
    Returns 'unknown' if no run in UNKNOWN_THRESHOLD_HOURS (48h),
    detecting when the health checker itself has stopped running.
    """
    if not health_record or not health_record.get("updated_at"):
        return "unknown"
    dt = now_dt or datetime.datetime.now(datetime.timezone.utc)
    try:
        updated_at = datetime.datetime.fromisoformat(health_record["updated_at"].replace("Z", "+00:00"))
        if (dt - updated_at).total_seconds() > (UNKNOWN_THRESHOLD_HOURS * 3600):
            return "unknown"
    except Exception:
        return "unknown"
    return health_record.get("status", "unknown")


def emit_alert(store_id: str, display_name: str, event_type: str, reason: str, consecutive_failures: int):
    """
    Emits structured alert for scraper state transitions.
    """
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if event_type == "broken":
        print(
            f"🚨 [SCRAPER HEALTH ALERT - CRITICAL] Store '{display_name}' ({store_id}) is BROKEN! "
            f"Consecutive Failures: {consecutive_failures} | Primary Reason: {reason} | At: {timestamp}",
            file=sys.stderr
        )
    elif event_type == "recovery":
        print(
            f"✅ [SCRAPER HEALTH RECOVERY] Store '{display_name}' ({store_id}) has RECOVERED to healthy! "
            f"All selectors functional. | At: {timestamp}"
        )
    elif event_type == "degraded":
        print(
            f"⚠️ [SCRAPER HEALTH WARNING - DEGRADED] Store '{display_name}' ({store_id}) is DEGRADED! "
            f"Reason: {reason} | At: {timestamp}"
        )


def evaluate_store_health(
    store_id: str,
    results_for_store: List[ScrapeResult],
    prior_health: Optional[Dict[str, Any]] = None,
    recent_item_counts: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Evaluates new health state for a single store based on its latest scrape results.
    """
    selectors = get_selectors(store_id)
    display_name = selectors.display_name if selectors else store_id.title()
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    now_iso = now_dt.isoformat()

    # Default prior values
    consecutive_failures = prior_health.get("consecutive_failures", 0) if prior_health else 0
    prior_status = prior_health.get("status", "unknown") if prior_health else "unknown"
    baseline = float(prior_health.get("baseline_item_count", 10.0)) if prior_health and prior_health.get("baseline_item_count") else 10.0
    last_success_at = prior_health.get("last_success_at") if prior_health else None
    last_failure_at = prior_health.get("last_failure_at") if prior_health else None
    last_failure_reason = prior_health.get("last_failure_reason") if prior_health else None
    alerted_at = prior_health.get("alerted_at") if prior_health else None

    # Compute baseline from recent healthy counts if provided
    if recent_item_counts:
        baseline = calculate_rolling_median(recent_item_counts)

    # Assess the latest batch results
    any_success = any(r.ok for r in results_for_store)
    all_failed = all(not r.ok for r in results_for_store) if results_for_store else True
    total_items = sum(r.item_count for r in results_for_store)
    total_priced = sum(r.priced_count for r in results_for_store)
    avg_items_per_query = total_items / max(len(results_for_store), 1)

    # Primary failure reason in current batch
    failure_reasons = [r.failure_reason for r in results_for_store if r.failure_reason]
    current_failure_reason = failure_reasons[0] if failure_reasons else None

    # Determine status & failure count updates
    should_alert_broken = False
    should_alert_recovery = False

    if all_failed or not any_success:
        consecutive_failures += 1
        last_failure_at = now_iso
        last_failure_reason = current_failure_reason or "unknown_failure"

        if consecutive_failures >= CONSECUTIVE_FAILURES_TO_ALERT:
            status = "broken"
            # Check alert cooldown
            cooldown_passed = True
            if alerted_at:
                try:
                    last_alert_dt = datetime.datetime.fromisoformat(alerted_at.replace("Z", "+00:00"))
                    cooldown_passed = (now_dt - last_alert_dt).total_seconds() >= (ALERT_COOLDOWN_HOURS * 3600)
                except Exception:
                    cooldown_passed = True

            if cooldown_passed:
                should_alert_broken = True
                alerted_at = now_iso
        else:
            status = "degraded"
    else:
        # Success occurred
        last_success_at = now_iso

        # Check for subtle baseline degradation (low yield or heavily unpriced)
        is_low_yield = avg_items_per_query < (baseline * LOW_YIELD_RATIO)
        is_heavy_unpriced = total_items > 0 and (total_priced / total_items) < (1.0 - UNPRICED_RATIO_THRESHOLD)

        if is_low_yield or is_heavy_unpriced:
            status = "degraded"
            last_failure_reason = "low_yield" if is_low_yield else "all_unpriced"
        else:
            status = "healthy"
            last_failure_reason = None

        if prior_status == "broken" and status == "healthy":
            should_alert_recovery = True
            alerted_at = None

        consecutive_failures = 0

    if should_alert_broken:
        emit_alert(store_id, display_name, "broken", last_failure_reason or "consecutive_failures", consecutive_failures)
    elif should_alert_recovery:
        emit_alert(store_id, display_name, "recovery", "recovered", 0)

    return {
        "store_id": store_id,
        "display_name": display_name,
        "status": status,
        "consecutive_failures": consecutive_failures,
        "last_success_at": last_success_at,
        "last_failure_at": last_failure_at,
        "last_failure_reason": last_failure_reason,
        "baseline_item_count": round(baseline, 2),
        "alerted_at": alerted_at,
        "updated_at": now_iso
    }


def record_run(
    results: List[ScrapeResult],
    run_id: Optional[str] = None,
    client=None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Records batch scrape results:
    1. Persists individual query records into scraper_runs.
    2. Fetches prior health state and computes transitions.
    3. Updates scraper_health for each store.
    """
    active_run_id = run_id or str(uuid.uuid4())
    sb = None if dry_run else (client or supabase_client)

    # 1. Prepare scraper_runs records
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    runs_payload = []
    store_results_map: Dict[str, List[ScrapeResult]] = {}

    for r in results:
        runs_payload.append({
            "store_id": r.store_id,
            "query": r.query,
            "ok": r.ok,
            "item_count": r.item_count,
            "priced_count": r.priced_count,
            "http_status": r.http_status,
            "duration_ms": r.duration_ms,
            "failure_reason": r.failure_reason,
            "selector_hits": r.selector_hits,
            "sample_titles": r.sample_titles,
            "error": r.error,
            "run_id": active_run_id,
            "created_at": now_iso
        })
        store_results_map.setdefault(r.store_id, []).append(r)

    # Persist runs
    if sb:
        save_scraper_runs(runs_payload, client=sb)

    # 2. Fetch existing health records
    existing_health_list = get_scraper_health(client=sb) if sb else []
    existing_health_map = {h["store_id"]: h for h in existing_health_list if isinstance(h, dict)}

    # 3. Evaluate and update each store
    updated_health_records = []
    for store_id, store_res in store_results_map.items():
        prior = existing_health_map.get(store_id)
        recent_counts = []
        if sb:
            recent_runs = get_recent_runs_for_store(store_id, limit=20, client=sb)
            recent_counts = [r["item_count"] for r in recent_runs if r.get("item_count") is not None]

        eval_result = evaluate_store_health(
            store_id=store_id,
            results_for_store=store_res,
            prior_health=prior,
            recent_item_counts=recent_counts
        )

        if sb:
            update_scraper_health(eval_result, client=sb)

        updated_health_records.append(eval_result)

    broken_stores = [h["store_id"] for h in updated_health_records if h["status"] == "broken"]
    degraded_stores = [h["store_id"] for h in updated_health_records if h["status"] == "degraded"]
    healthy_stores = [h["store_id"] for h in updated_health_records if h["status"] == "healthy"]

    return {
        "run_id": active_run_id,
        "total_queries_run": len(results),
        "stores_evaluated": len(store_results_map),
        "healthy_count": len(healthy_stores),
        "degraded_count": len(degraded_stores),
        "broken_count": len(broken_stores),
        "broken_stores": broken_stores,
        "degraded_stores": degraded_stores,
        "records": updated_health_records
    }
