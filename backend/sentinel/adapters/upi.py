"""UPI payment adapter.

Handles two ingestion paths:
  1. Live webhook — Razorpay UPI webhook POST payload
  2. Simulated — generates realistic UPI traffic for the demo

UPI-specific features fed to the engine:
  amount_inr       : transaction amount in Indian Rupees
  vpa_hash         : hashed VPA (anonymised payer ID) for entity tracking
  upi_ref_id       : NPCI 12-digit reference number
  count_in_window  : recent transaction count for this VPA
  is_new_payee     : 1.0 if this payee VPA has never been seen before, else 0.0
"""

from __future__ import annotations

import hashlib
import random
import time
from datetime import datetime, timezone
from typing import Mapping

from ..core.events import NormalizedEvent
from .base import as_timestamp

# Realistic VPAs used in the simulator
_PAYER_VPAS = [
    "rohit.sharma@okicici",
    "priya.v@paytm",
    "karan91@ybl",
    "sunita.k@okhdfc",
    "amit.r@okhdfcbank",
]
_PAYEE_VPAS = [
    "merchant.zomato@hdfcbank",
    "amazon.pay@apl",
    "flipkart.uat@ybl",
    "flipkart@ybl",
    "swiggy@icici",
    "netflix@axisbank",
    "hpcl.petrol@ybl",
    "dmart@icici",
    "cafecoffeeday@paytm",
    "bmtc@upi",
    "metro@upi",
    "apollopharmacy@ybl",
    "cultfit@razorpay",
    "airtel@airtel",
    "bescom@ybl",
    "merchant@paytm",
    "unknown.payee@paytm",  # suspicious — triggers is_new_payee
]

# Track seen payees for is_new_payee feature
_SEEN_PAYEES: set[str] = set(_PAYEE_VPAS[:-1])  # exclude unknown.payee initially


def _vpa_entity(vpa: str) -> str:
    """Stable entity ID from VPA — hashed so raw VPA is not logged."""
    return "upi_" + hashlib.sha256(vpa.encode()).hexdigest()[:12]


def _npci_ref() -> str:
    return str(random.randint(100000000000, 999999999999))


class UPIAdapter:
    """Normalises raw UPI events (webhook or simulated) → NormalizedEvent."""

    source = "upi"

    def normalize(self, raw: Mapping) -> NormalizedEvent:
        """Accept both Razorpay webhook shape and our simulated shape."""
        # Razorpay webhook has nested payload.payment.entity
        if "payload" in raw and "payment" in raw.get("payload", {}):
            entity = raw["payload"]["payment"]["entity"]
            vpa = entity.get("vpa", "unknown@upi")
            amount_inr = entity.get("amount", 0) / 100  # Razorpay sends paise
            upi_ref = entity.get("acquirer_data", {}).get("rrn", _npci_ref())
            ts = entity.get("created_at")
            ts = datetime.fromtimestamp(ts, tz=timezone.utc) if ts else None
        else:
            # Simulated / direct shape
            vpa = str(raw.get("vpa", "unknown@upi"))
            amount_inr = float(raw.get("amount_inr", 100.0))
            upi_ref = str(raw.get("upi_ref_id", _npci_ref()))
            ts = as_timestamp(raw.get("ts"))

        payee_vpa = str(raw.get("payee_vpa", "unknown@upi"))
        count = int(raw.get("count_in_window", 1))

        is_new = 0.0
        if payee_vpa not in _SEEN_PAYEES:
            is_new = 1.0
        else:
            _SEEN_PAYEES.add(payee_vpa)

        return NormalizedEvent(
            source=self.source,
            entity_id=_vpa_entity(vpa),
            timestamp=ts or datetime.now(tz=timezone.utc),
            features={
                "amount_inr": amount_inr,
                "count_in_window": count,
                "is_new_payee": is_new,
            },
        )


class UPISimulator:
    """Generates realistic UPI transaction events for the demo."""

    def __init__(self, seed: int = 42) -> None:
        self._rng = random.Random(seed)
        self._adapter = UPIAdapter()
        self._window_counts: dict[str, int] = {}

    def next_event(self, attack: bool = False) -> NormalizedEvent:
        vpa = self._rng.choice(_PAYER_VPAS)
        entity = _vpa_entity(vpa)
        self._window_counts[entity] = self._window_counts.get(entity, 0) + 1

        if attack:
            # UPI fraud: sudden high-value transfer to unknown payee
            amount = self._rng.uniform(45000, 100000)
            payee = "unknown.payee@paytm"
            count = self._window_counts[entity] + self._rng.randint(20, 50)
        else:
            amount = self._rng.uniform(50, 5000)
            payee = self._rng.choice(_PAYEE_VPAS[:-1])
            count = self._window_counts[entity]

        raw = {
            "vpa": vpa,
            "payee_vpa": payee,
            "amount_inr": amount,
            "upi_ref_id": _npci_ref(),
            "count_in_window": count,
            "ts": None,
        }
        return self._adapter.normalize(raw)
