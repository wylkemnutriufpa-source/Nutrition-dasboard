"""
Automation Engine – dynamic user_id resolver for notify actions.

Supported targets
─────────────────
  "org_owner"
    → The professional/admin who owns the org.
      In this platform, org_id IS the professional's user_id,
      so we validate the profile exists and return org_id.

  "assigned_professional"
    → The professional linked to the patient via patient_profiles.
      Falls back to org_owner if no mapping is found.

Backward compatibility
──────────────────────
  If the action already contains a non-empty user_id, it is used
  directly and the resolver is never called.

Usage (from actions.py)
───────────────────────
  resolved = await resolve_notification_target(
      target="org_owner",
      org_id=ctx.event.org_id,
      patient_id=ctx.event.patient_id,
      supabase_url=supabase_url,
      service_role_key=key,
  )
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Public entry-point
# ─────────────────────────────────────────────────────────────

async def resolve_notification_target(
    target: str,
    org_id: str,
    patient_id: Optional[str],
    supabase_url: str,
    service_role_key: str,
) -> Optional[str]:
    """
    Resolve a *target* string to a concrete user UUID.

    Parameters
    ──────────
    target           : "org_owner" | "assigned_professional"
    org_id           : the event's org_id
    patient_id       : the event's patient_id (may be None)
    supabase_url     : Supabase project URL
    service_role_key : service-role key (bypasses RLS)

    Returns a user UUID string, or None if resolution fails.
    """
    target = (target or "").strip().lower()

    if target == "org_owner":
        return await _resolve_org_owner(org_id, supabase_url, service_role_key)

    if target == "assigned_professional":
        if patient_id:
            prof_id = await _resolve_assigned_professional(
                patient_id, supabase_url, service_role_key
            )
            if prof_id:
                logger.debug(
                    "Target assigned_professional resolved: patient=%s → prof=%s",
                    patient_id, prof_id
                )
                return prof_id
            logger.debug(
                "Target assigned_professional: no mapping for patient=%s, "
                "falling back to org_owner=%s",
                patient_id, org_id
            )
        else:
            logger.debug(
                "Target assigned_professional: no patient_id, falling back to org_owner"
            )
        return await _resolve_org_owner(org_id, supabase_url, service_role_key)

    logger.warning("Unknown target '%s' – cannot resolve user_id", target)
    return None


# ─────────────────────────────────────────────────────────────
# Internal resolvers
# ─────────────────────────────────────────────────────────────

async def _resolve_org_owner(
    org_id: str,
    supabase_url: str,
    key: str,
) -> Optional[str]:
    """
    In this platform, org_id == professional user_id.
    Validate the profile exists and return org_id.
    Falls back to org_id directly if the HTTP call fails
    (avoids blocking engine on transient network errors).
    """
    if not org_id:
        return None

    headers = {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{supabase_url}/rest/v1/profiles",
                headers=headers,
                params={
                    "id":     f"eq.{org_id}",
                    "select": "id,role",
                    "limit":  "1",
                },
            )
        if resp.status_code == 200:
            rows = resp.json() or []
            if rows:
                profile = rows[0]
                logger.debug(
                    "org_owner resolved: id=%s role=%s",
                    profile.get("id"), profile.get("role")
                )
                return profile["id"]
            logger.warning(
                "org_owner: profile not found for org_id=%s – using org_id as fallback",
                org_id
            )
            # Fail-safe: return org_id even if not in profiles
            # (avoids dropping the notification entirely)
            return org_id
        logger.error(
            "org_owner profile lookup failed %d: %s",
            resp.status_code, resp.text[:150]
        )
    except Exception as exc:
        logger.error("org_owner resolution error: %s", exc)

    # Fail-safe fallback
    return org_id


async def _resolve_assigned_professional(
    patient_id: str,
    supabase_url: str,
    key: str,
) -> Optional[str]:
    """
    Query patient_profiles to find the professional assigned to *patient_id*.
    Returns professional_id, or None if not found.
    """
    if not patient_id:
        return None

    headers = {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{supabase_url}/rest/v1/patient_profiles",
                headers=headers,
                params={
                    "patient_id": f"eq.{patient_id}",
                    "select":     "professional_id",
                    "limit":      "1",
                },
            )
        if resp.status_code == 200:
            rows = resp.json() or []
            if rows:
                return rows[0].get("professional_id")
            logger.debug(
                "assigned_professional: no patient_profile for patient_id=%s",
                patient_id
            )
            return None
        logger.error(
            "assigned_professional lookup failed %d: %s",
            resp.status_code, resp.text[:150]
        )
    except Exception as exc:
        logger.error("assigned_professional resolution error: %s", exc)

    return None
