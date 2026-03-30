"""
Persisted chat sessions (UI conversation history).

Stored in SQLite separate from assistant memory (memory.db). Used only for
reopening past conversations in the web client.
"""

from __future__ import annotations

import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from typing import Any

from app.paths import CHAT_SESSIONS_DB_PATH, ensure_data_dir


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def _json_loads(s: str, default: Any) -> Any:
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        return default


class ChatSessionsService:
    def __init__(self, db_path: str = CHAT_SESSIONS_DB_PATH) -> None:
        self._db_path = db_path
        ensure_data_dir()
        self._init_db()

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    summary TEXT,
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    messages_json TEXT NOT NULL DEFAULT '[]',
                    message_count INTEGER NOT NULL DEFAULT 0,
                    pinned INTEGER NOT NULL DEFAULT 0
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated "
                "ON chat_sessions (updated_at DESC)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_chat_sessions_pin_updated "
                "ON chat_sessions (pinned DESC, updated_at DESC)"
            )
            conn.commit()

    @contextmanager
    def _connect(self):
        conn = sqlite3.connect(self._db_path, timeout=30.0)
        try:
            conn.execute("PRAGMA journal_mode=WAL")
            yield conn
        finally:
            conn.close()

    def create(
        self,
        title: str | None = None,
        duplicate_from: str | None = None,
    ) -> dict[str, Any]:
        now = time.time()
        eid = str(uuid.uuid4())
        if duplicate_from:
            src = self.get(duplicate_from)
            if not src:
                raise ValueError("Source session not found")
            title = title or (src["title"] + " (copy)")[:500]
            messages = src["messages"]
            summary = src.get("summary")
            metadata = dict(src.get("metadata") or {})
            mc = len(messages) if isinstance(messages, list) else 0
        else:
            title = (title or "New Chat").strip()[:500] or "New Chat"
            messages = []
            summary = None
            metadata = {}
            mc = 0
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO chat_sessions (
                    id, title, created_at, updated_at, summary,
                    metadata_json, messages_json, message_count, pinned
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                """,
                (
                    eid,
                    title,
                    now,
                    now,
                    summary,
                    _json_dumps(metadata),
                    _json_dumps(messages),
                    mc,
                ),
            )
            conn.commit()
        return self.get(eid) or {}

    def get(self, session_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            cur = conn.execute(
                """
                SELECT id, title, created_at, updated_at, summary,
                       metadata_json, messages_json, message_count, pinned
                FROM chat_sessions WHERE id = ?
                """,
                (session_id,),
            )
            row = cur.fetchone()
        if not row:
            return None
        return self._row_to_full(row)

    def _row_to_full(self, row: tuple) -> dict[str, Any]:
        messages = _json_loads(row[6], [])
        if not isinstance(messages, list):
            messages = []
        meta = _json_loads(row[5], {})
        if not isinstance(meta, dict):
            meta = {}
        return {
            "id": row[0],
            "title": row[1],
            "created_at": row[2],
            "updated_at": row[3],
            "summary": row[4],
            "metadata": meta,
            "messages": messages,
            "message_count": int(row[7]),
            "pinned": bool(row[8]),
        }

    def list_summaries(
        self,
        q: str | None = None,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        limit = max(1, min(limit, 500))
        params: list[Any] = []
        where = ""
        if q and q.strip():
            term = f"%{q.strip().replace('%', '\\%').replace('_', '\\_')}%"
            where = "WHERE title LIKE ? ESCAPE '\\' OR IFNULL(summary,'') LIKE ? ESCAPE '\\'"
            params.extend([term, term])
        sql = f"""
            SELECT id, title, created_at, updated_at, message_count, pinned
            FROM chat_sessions
            {where}
            ORDER BY pinned DESC, updated_at DESC
            LIMIT ?
        """
        params.append(limit)
        with self._connect() as conn:
            cur = conn.execute(sql, params)
            rows = cur.fetchall()
        return [
            {
                "id": r[0],
                "title": r[1],
                "created_at": r[2],
                "updated_at": r[3],
                "message_count": int(r[4]),
                "pinned": bool(r[5]),
            }
            for r in rows
        ]

    def replace_content(
        self,
        session_id: str,
        messages: list[dict[str, Any]],
        *,
        title: str | None = None,
        summary: str | None = None,
        update_summary: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> bool:
        now = time.time()
        mc = len(messages)
        with self._connect() as conn:
            cur = conn.execute(
                "SELECT metadata_json FROM chat_sessions WHERE id = ?",
                (session_id,),
            )
            row = cur.fetchone()
            if not row:
                return False
            existing_meta = _json_loads(row[0], {})
            if not isinstance(existing_meta, dict):
                existing_meta = {}
            merged = dict(metadata) if metadata is not None else existing_meta
            sets = [
                "updated_at = ?",
                "messages_json = ?",
                "message_count = ?",
                "metadata_json = ?",
            ]
            values: list[Any] = [now, _json_dumps(messages), mc, _json_dumps(merged)]
            if title is not None:
                sets.append("title = ?")
                values.append(title.strip()[:500] or "New Chat")
            if update_summary:
                sets.append("summary = ?")
                values.append(
                    (summary or "")[:20_000] if summary is not None else None
                )
            values.append(session_id)
            conn.execute(
                f"UPDATE chat_sessions SET {', '.join(sets)} WHERE id = ?",
                values,
            )
            conn.commit()
        return True

    def patch_fields(self, session_id: str, updates: dict[str, Any]) -> bool:
        """updates may include title (str) and/or pinned (bool)."""
        if not updates:
            with self._connect() as conn:
                cur = conn.execute(
                    "SELECT 1 FROM chat_sessions WHERE id = ?", (session_id,)
                )
                return cur.fetchone() is not None
        now = time.time()
        sets = ["updated_at = ?"]
        values: list[Any] = [now]
        if "title" in updates:
            t = str(updates["title"]).strip()[:500] or "New Chat"
            sets.append("title = ?")
            values.append(t)
        if "pinned" in updates:
            sets.append("pinned = ?")
            values.append(1 if bool(updates["pinned"]) else 0)
        values.append(session_id)
        with self._connect() as conn:
            cur = conn.execute(
                f"UPDATE chat_sessions SET {', '.join(sets)} WHERE id = ?",
                values,
            )
            conn.commit()
            return cur.rowcount > 0

    def delete(self, session_id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
            conn.commit()
            return cur.rowcount > 0


_service: ChatSessionsService | None = None


def get_chat_sessions_service() -> ChatSessionsService:
    global _service
    if _service is None:
        _service = ChatSessionsService()
    return _service
