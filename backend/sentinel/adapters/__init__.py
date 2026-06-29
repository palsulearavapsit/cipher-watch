"""Source adapters. Each emits the one NormalizedEvent shape; the engine never
knows which adapter produced an event. Adding a source = adding one module here."""

from .base import SourceAdapter
from .transaction import TransactionAdapter
from .database import DatabaseAdapter
from .auth import AuthAdapter

__all__ = ["SourceAdapter", "TransactionAdapter", "DatabaseAdapter", "AuthAdapter"]
