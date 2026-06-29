"""Blockchain adapter — Etherscan API.

Polls the Etherscan API for a watched wallet address and normalises
each transaction into a NormalizedEvent for the anomaly engine.

Features:
  value_eth       : transaction value in ETH
  gas_price_gwei  : gas price (proxy for urgency / MEV)
  is_contract     : 1.0 if the counterparty is a contract address
  tx_count_24h    : running count of txs from this wallet in 24 h window

Set ENABLE_BLOCKCHAIN=true and ETHERSCAN_API_KEY + WATCHED_WALLETS in .env.
WATCHED_WALLETS is a comma-separated list of ETH addresses.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Callable, Coroutine

import httpx

from ..core.events import NormalizedEvent

logger = logging.getLogger(__name__)

_ETHERSCAN_URL = "https://api.etherscan.io/v2/api"
_WEI_PER_ETH = 1e18
_GWEI_PER_WEI = 1e9
_POLL_INTERVAL = 15  # seconds between Etherscan polls


def _entity_id(address: str) -> str:
    return f"wallet_{address[:8].lower()}"


class BlockchainAdapter:
    """Normalises raw Etherscan transaction dicts → NormalizedEvent."""

    source = "blockchain"

    def __init__(self) -> None:
        self._tx_counts: dict[str, int] = {}

    def normalize(self, tx: dict) -> NormalizedEvent:
        address = tx.get("from", "0x0")
        entity = _entity_id(address)
        self._tx_counts[entity] = self._tx_counts.get(entity, 0) + 1

        value_eth = int(tx.get("value", "0")) / _WEI_PER_ETH
        gas_price = int(tx.get("gasPrice", "0")) / _GWEI_PER_WEI  # gwei
        is_contract = 1.0 if tx.get("contractAddress") else 0.0

        ts_raw = tx.get("timeStamp")
        ts = (
            datetime.fromtimestamp(int(ts_raw), tz=timezone.utc)
            if ts_raw
            else datetime.now(tz=timezone.utc)
        )

        return NormalizedEvent(
            source=self.source,
            entity_id=entity,
            timestamp=ts,
            features={
                "value_eth": value_eth,
                "gas_price_gwei": gas_price,
                "is_contract": is_contract,
                "tx_count_24h": float(self._tx_counts[entity]),
            },
        )


class EtherscanPoller:
    """Background task: polls Etherscan and pushes events onto the bus."""

    def __init__(
        self,
        on_event: Callable[[NormalizedEvent], Coroutine],
        api_key: str,
        wallets: list[str],
        poll_interval: int = _POLL_INTERVAL,
    ) -> None:
        self._on_event = on_event
        self._api_key = api_key
        self._wallets = wallets
        self._poll_interval = poll_interval
        self._adapter = BlockchainAdapter()
        self._seen_hashes: set[str] = set()
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        self._task = asyncio.create_task(self._loop())
        logger.info("EtherscanPoller: watching %d wallet(s)", len(self._wallets))

    def stop(self) -> None:
        if self._task:
            self._task.cancel()

    async def _loop(self) -> None:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                while True:
                    for wallet in self._wallets:
                        await self._poll_wallet(client, wallet)
                    await asyncio.sleep(self._poll_interval)
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("EtherscanPoller crashed: %s", exc)

    async def _poll_wallet(self, client: httpx.AsyncClient, wallet: str) -> None:
        try:
            resp = await client.get(
                _ETHERSCAN_URL,
                params={
                    "chainid": "1",
                    "module": "account",
                    "action": "txlist",
                    "address": wallet,
                    "sort": "desc",
                    "offset": 10,
                    "page": 1,
                    "apikey": self._api_key,
                },
            )
            data = resp.json()
            if data.get("status") != "1":
                return

            for tx in data.get("result", []):
                tx_hash = tx.get("hash", "")
                if tx_hash in self._seen_hashes:
                    continue
                self._seen_hashes.add(tx_hash)
                event = self._adapter.normalize(tx)
                await self._on_event(event)

        except Exception as exc:
            logger.warning("EtherscanPoller._poll_wallet(%s): %s", wallet[:8], exc)


class BlockchainSimulator:
    """Generates mock blockchain events when Etherscan is unavailable."""

    def __init__(self, seed: int = 99) -> None:
        import random
        self._rng = random.Random(seed)
        self._adapter = BlockchainAdapter()
        self._wallets = [
            "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
            "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
        ]

    def next_event(self, attack: bool = False) -> NormalizedEvent:
        wallet = self._rng.choice(self._wallets)
        if attack:
            value_eth = self._rng.uniform(50, 500)
            gas = self._rng.uniform(500, 2000)
            is_contract = 1.0
        else:
            value_eth = self._rng.uniform(0.001, 2.0)
            gas = self._rng.uniform(10, 100)
            is_contract = 0.0

        tx = {
            "from": wallet,
            "value": str(int(value_eth * _WEI_PER_ETH)),
            "gasPrice": str(int(gas * _GWEI_PER_WEI)),
            "contractAddress": "0xabc" if is_contract else "",
            "hash": f"0x{self._rng.randbytes(16).hex()}",
            "timeStamp": None,
        }
        return self._adapter.normalize(tx)
