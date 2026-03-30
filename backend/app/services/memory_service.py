"""
Lightweight local SQLite memory: preferences, facts, summaries.
"""

from __future__ import annotations

import sqlite3
import time
import uuid
from contextlib import contextmanager

from app.paths import MEMORY_DB_PATH, ensure_data_dir


class MemoryService:
    CATEGORIES = ("preference", "fact", "summary")

    def __init__(self, db_path: str = MEMORY_DB_PATH) -> None:
        self._db_path = db_path
        ensure_data_dir()
        self._init_db()

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS memory_entries (
                    id TEXT PRIMARY KEY,
                    category TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at REAL NOT NULL
                )
                """
            )
            conn.commit()

    @contextmanager
    def _connect(self):
        conn = sqlite3.connect(self._db_path)
        try:
            yield conn
        finally:
            conn.close()

    def add(self, category: str, content: str) -> str:
        if category not in self.CATEGORIES:
            raise ValueError(f"Invalid category: {category}")
        eid = str(uuid.uuid4())
        now = time.time()
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO memory_entries (id, category, content, created_at) VALUES (?, ?, ?, ?)",
                (eid, category, content, now),
            )
            conn.commit()
        return eid

    def list_all(self, category: str | None = None) -> list[dict]:
        with self._connect() as conn:
            if category:
                cur = conn.execute(
                    "SELECT id, category, content, created_at FROM memory_entries WHERE category = ? ORDER BY created_at DESC",
                    (category,),
                )
            else:
                cur = conn.execute(
                    "SELECT id, category, content, created_at FROM memory_entries ORDER BY created_at DESC"
                )
            rows = cur.fetchall()
        return [
            {"id": r[0], "category": r[1], "content": r[2], "created_at": r[3]}
            for r in rows
        ]

    def delete(self, entry_id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM memory_entries WHERE id = ?", (entry_id,))
            conn.commit()
            return cur.rowcount > 0

    def clear_all(self) -> int:
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM memory_entries")
            conn.commit()
            return cur.rowcount

    def count(self) -> int:
        with self._connect() as conn:
            cur = conn.execute("SELECT COUNT(*) FROM memory_entries")
            return int(cur.fetchone()[0])

    def format_for_prompt(self, max_items: int = 12, max_chars: int = 4000) -> str:
        """Compact block for optional system-context injection (modular, can be disabled)."""
        entries = self.list_all()
        if not entries:
            return ""
        lines: list[str] = []
        total = 0
        for e in entries[:max_items]:
            line = f"- [{e['category']}] {e['content'][:500]}"
            if total + len(line) > max_chars:
                break
            lines.append(line)
            total += len(line) + 1
        return "\n".join(lines)


_memory: MemoryService | None = None


def get_memory_service() -> MemoryService:
    global _memory
    if _memory is None:
        _memory = MemoryService()
    return _memory
