"""
Automation Engine – Scheduler

Background scheduler that periodically runs:
1. Detectors (scan for conditions and emit events) – every N hours per org
2. Worker (process pending events and execute rules) – every N minutes

Configuration via environment variables:
  AUTOMATION_ENGINE_ENABLED         = "true" | "false"  (default: false)
  AUTOMATION_WORKER_INTERVAL_MINUTES = int              (default: 5)
  AUTOMATION_DETECTOR_INTERVAL_HOURS = int              (default: 6)
  AUTOMATION_TARGET_ORG_IDS          = "org1,org2,..."  (comma-separated)

Features:
  - Safe: no infinite loops, proper error handling
  - Logging: execution time and results logged for monitoring
  - Graceful shutdown: scheduler stops cleanly on app shutdown
  - Disable: set AUTOMATION_ENGINE_ENABLED=false to disable

Usage:
  from services.automation_engine.scheduler import automation_scheduler
  
  @app.on_event("startup")
  async def startup():
      await automation_scheduler.start()
  
  @app.on_event("shutdown")
  async def shutdown():
      await automation_scheduler.stop()
"""
from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict, List, Optional

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)


class AutomationScheduler:
    """
    Background scheduler for automation engine tasks.
    """

    def __init__(self):
        self.scheduler: Optional[AsyncIOScheduler] = None
        self.enabled = False
        self.worker_interval_minutes = 5
        self.detector_interval_hours = 6
        self.target_org_ids: List[str] = []
        self.supabase_url = ""
        self.service_role_key = ""

    def _load_config(self):
        """Load configuration from environment variables."""
        self.enabled = os.environ.get("AUTOMATION_ENGINE_ENABLED", "false").lower() == "true"
        
        try:
            self.worker_interval_minutes = int(
                os.environ.get("AUTOMATION_WORKER_INTERVAL_MINUTES", "5")
            )
        except ValueError:
            logger.warning("Invalid AUTOMATION_WORKER_INTERVAL_MINUTES, using default: 5")
            self.worker_interval_minutes = 5

        try:
            self.detector_interval_hours = int(
                os.environ.get("AUTOMATION_DETECTOR_INTERVAL_HOURS", "6")
            )
        except ValueError:
            logger.warning("Invalid AUTOMATION_DETECTOR_INTERVAL_HOURS, using default: 6")
            self.detector_interval_hours = 6

        org_ids_str = os.environ.get("AUTOMATION_TARGET_ORG_IDS", "")
        self.target_org_ids = [
            oid.strip() for oid in org_ids_str.split(",") if oid.strip()
        ]

        self.supabase_url = os.environ.get("SUPABASE_URL", "")
        self.service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

        logger.info("Automation Scheduler Configuration:")
        logger.info(f"  Enabled: {self.enabled}")
        logger.info(f"  Worker interval: {self.worker_interval_minutes} minutes")
        logger.info(f"  Detector interval: {self.detector_interval_hours} hours")
        logger.info(f"  Target org_ids: {len(self.target_org_ids)} orgs")

    async def _run_worker(self):
        """
        Execute the automation engine worker (process pending events).
        Calls the internal worker logic directly instead of HTTP endpoint.
        """
        if not self.supabase_url or not self.service_role_key:
            logger.error("Worker skipped: Supabase credentials not configured")
            return

        start_time = time.time()
        logger.info("🔄 [Scheduler] Running automation worker...")

        try:
            from .worker import process_pending_events

            result = await process_pending_events(
                supabase_url=self.supabase_url,
                service_role_key=self.service_role_key,
            )

            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.info(
                f"✅ [Scheduler] Worker completed in {elapsed_ms}ms: "
                f"{result['processed_events']} events, "
                f"{result['total_rules_triggered']} rules triggered"
            )

        except Exception as exc:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [Scheduler] Worker failed after {elapsed_ms}ms: {exc}")

    async def _run_detectors(self):
        """
        Execute detectors for all configured org_ids.
        Calls the internal detector logic directly.
        """
        if not self.supabase_url or not self.service_role_key:
            logger.error("Detectors skipped: Supabase credentials not configured")
            return

        if not self.target_org_ids:
            logger.warning("Detectors skipped: No target org_ids configured")
            return

        start_time = time.time()
        logger.info(f"🔍 [Scheduler] Running detectors for {len(self.target_org_ids)} orgs...")

        try:
            from .detectors import run_all_detectors

            total_emitted = 0

            for org_id in self.target_org_ids:
                try:
                    result = await run_all_detectors(
                        supabase_url=self.supabase_url,
                        service_role_key=self.service_role_key,
                        org_id=org_id,
                    )
                    emitted = result.get("total_emitted", 0)
                    total_emitted += emitted
                    logger.info(f"  Org {org_id[:8]}...: {emitted} events emitted")

                except Exception as exc:
                    logger.error(f"  Org {org_id[:8]}... failed: {exc}")

            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.info(
                f"✅ [Scheduler] Detectors completed in {elapsed_ms}ms: "
                f"{total_emitted} total events emitted"
            )

        except Exception as exc:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.error(f"❌ [Scheduler] Detectors failed after {elapsed_ms}ms: {exc}")

    async def start(self):
        """
        Start the scheduler if enabled.
        This should be called during FastAPI startup.
        """
        self._load_config()

        if not self.enabled:
            logger.info("⏸️  Automation Scheduler is DISABLED (set AUTOMATION_ENGINE_ENABLED=true to enable)")
            return

        if not self.supabase_url or not self.service_role_key:
            logger.error(
                "❌ Automation Scheduler cannot start: "
                "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set"
            )
            return

        # Create scheduler
        self.scheduler = AsyncIOScheduler()

        # Schedule worker (process events every N minutes)
        self.scheduler.add_job(
            self._run_worker,
            trigger=IntervalTrigger(minutes=self.worker_interval_minutes),
            id="automation_worker",
            name="Automation Worker",
            replace_existing=True,
            max_instances=1,  # Prevent concurrent runs
        )

        # Schedule detectors (scan for conditions every N hours)
        self.scheduler.add_job(
            self._run_detectors,
            trigger=IntervalTrigger(hours=self.detector_interval_hours),
            id="automation_detectors",
            name="Automation Detectors",
            replace_existing=True,
            max_instances=1,  # Prevent concurrent runs
        )

        # Start the scheduler
        self.scheduler.start()
        logger.info(
            f"✅ Automation Scheduler STARTED\n"
            f"   Worker runs every {self.worker_interval_minutes} minutes\n"
            f"   Detectors run every {self.detector_interval_hours} hours\n"
            f"   Monitoring {len(self.target_org_ids)} orgs"
        )

        # Run once immediately (optional: comment out if you want to wait for first interval)
        # logger.info("🚀 Running initial detection + worker cycle...")
        # await self._run_detectors()
        # await self._run_worker()

    async def stop(self):
        """
        Stop the scheduler gracefully.
        This should be called during FastAPI shutdown.
        """
        if self.scheduler and self.scheduler.running:
            logger.info("⏹️  Stopping Automation Scheduler...")
            self.scheduler.shutdown(wait=True)
            logger.info("✅ Automation Scheduler stopped")


# Global singleton instance
automation_scheduler = AutomationScheduler()
