"""Real wallet analysis — fetches actual transactions from Etherscan
and runs every one through the ML engine."""

from __future__ import annotations

import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_ETHERSCAN_URL = "https://api.etherscan.io/v2/api"
_WEI_PER_ETH = 1e18
_GWEI_PER_WEI = 1e9


async def fetch_wallet_transactions(address: str, limit: int = 50) -> list[dict]:
    """Fetch real transactions for a wallet from Etherscan."""
    api_key = os.environ.get("ETHERSCAN_API_KEY", "")
    if not api_key:
        raise ValueError("ETHERSCAN_API_KEY not configured")

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(_ETHERSCAN_URL, params={
            "chainid": "1",
            "module": "account",
            "action": "txlist",
            "address": address,
            "sort": "desc",
            "offset": limit,
            "page": 1,
            "apikey": api_key,
        })
        data = resp.json()

    if data.get("status") == "0":
        msg = data.get("message", "Unknown error")
        if "No transactions" in msg or data.get("result") == []:
            return []
        raise ValueError(f"Etherscan error: {msg}")

    return data.get("result", [])


def normalize_etherscan_tx(tx: dict, wallet_address: str) -> dict:
    """Convert raw Etherscan tx into the format our blockchain adapter expects."""
    value_eth = int(tx.get("value", "0")) / _WEI_PER_ETH
    gas_price = int(tx.get("gasPrice", "0")) / _GWEI_PER_WEI

    return {
        "from": tx.get("from", ""),
        "to": tx.get("to", ""),
        "value": tx.get("value", "0"),
        "gasPrice": tx.get("gasPrice", "0"),
        "contractAddress": tx.get("contractAddress", ""),
        "hash": tx.get("hash", ""),
        "timeStamp": tx.get("timeStamp"),
        # Extra for display
        "_value_eth": value_eth,
        "_gas_price_gwei": gas_price,
        "_is_inbound": tx.get("to", "").lower() == wallet_address.lower(),
        "_from": tx.get("from", ""),
        "_to": tx.get("to", ""),
        "_hash": tx.get("hash", ""),
        "_timestamp": tx.get("timeStamp"),
    }
