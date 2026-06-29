"""Parse UPI/bank statement CSV files into transaction dicts.

Handles common Indian bank statement CSV formats:
- HDFC, ICICI, SBI, Axis, Paytm, PhonePe exports
"""

from __future__ import annotations

import csv
import io
import re
from datetime import datetime, timezone


def parse_upi_csv(content: bytes) -> list[dict]:
    """Parse CSV bytes → list of transaction dicts ready for UPI adapter."""
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        raise ValueError("CSV file is empty or has no data rows")

    results = []
    seen_vpas: set[str] = set()

    for i, row in enumerate(rows):
        # Normalize column names
        clean = {k.strip().lower().replace(" ", "_"): str(v).strip() for k, v in row.items() if k}

        amount = _extract_amount(clean)
        if amount <= 0:
            continue

        vpa = _extract_vpa(clean)
        payee_vpa = _extract_payee(clean)

        # count_in_window = how many transactions from this VPA so far
        count = sum(1 for r in results if r.get("vpa") == vpa) + 1

        results.append({
            "vpa": vpa,
            "payee_vpa": payee_vpa,
            "amount_inr": amount,
            "count_in_window": count,
            "ts": _extract_date(clean),
            "_description": _extract_description(clean),
            "_row": i + 1,
        })

    if not results:
        raise ValueError("No valid transactions found. Check CSV format.")

    return results


def _extract_amount(row: dict) -> float:
    """Try common amount column names."""
    for key in ["debit", "amount", "withdrawal", "debit_amount", "transaction_amount",
                "dr", "amount_(inr)", "txn_amount", "debit_(inr)"]:
        val = row.get(key, "")
        cleaned = re.sub(r"[₹,\s]", "", val)
        try:
            amt = float(cleaned)
            if amt > 0:
                return amt
        except (ValueError, TypeError):
            pass
    return 0.0


def _extract_vpa(row: dict) -> str:
    for key in ["vpa", "upi_id", "payer_vpa", "sender_vpa", "from_vpa"]:
        val = row.get(key, "")
        if "@" in val:
            return val.strip()
    # Try to extract VPA from description fields like "UPI/priya.v@paytm/Zomato Food"
    for key in ["narration", "description", "remarks", "transaction_remarks"]:
        val = row.get(key, "")
        if "@" in val:
            # Extract the word containing @ (e.g. "priya.v@paytm" from "UPI/priya.v@paytm/Zomato")
            match = re.search(r'[\w.\-]+@[\w.\-]+', val)
            if match:
                return match.group(0)
    return f"user_{hash(str(row)) % 10000}@upi"


def _extract_payee(row: dict) -> str:
    for key in ["payee_vpa", "beneficiary_vpa", "to_vpa", "receiver_vpa", "merchant", "payee", "to"]:
        val = row.get(key, "")
        if "@" in val:
            return val.strip()
    # Extract payee from description: last UPI ID after the merchant name
    for key in ["narration", "description", "remarks", "transaction_remarks"]:
        val = row.get(key, "")
        if "@" in val:
            matches = re.findall(r'[\w.\-]+@[\w.\-]+', val)
            if len(matches) >= 2:
                return matches[-1]  # Second VPA in the string is usually payee
            # If description contains "unknown" it's a suspicious payee
            if "unknown" in val.lower():
                return "unknown.payee@paytm"
    return "merchant@upi"


def _extract_description(row: dict) -> str:
    for key in ["description", "narration", "remarks", "transaction_remarks",
                "particulars", "details"]:
        val = row.get(key, "")
        if val:
            return val[:100]
    return ""


def _extract_date(row: dict) -> str | None:
    for key in ["date", "transaction_date", "txn_date", "value_date", "posting_date"]:
        val = row.get(key, "")
        if val:
            return val
    return None
