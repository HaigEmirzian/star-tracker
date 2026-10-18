"""Conservative EDGAR monitor. Python 3.11+, standard library only."""
import argparse
import csv
import datetime as dt
import email.utils
from email.message import EmailMessage
import html
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import random
import re
import smtplib
import socket
import sqlite3
import ssl
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

LOG = logging.getLogger("edgar")
ACC = re.compile(r"\d{10}-\d{2}-\d{6}")


def utc():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def load_config(path):
    cfg = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    ua = cfg.get("user_agent", "")
    if not re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", ua) or "example" in ua.lower() or "your" in ua.lower():
        raise ValueError("Set user_agent to your actual name/application and contact email")
    if not 15 <= cfg["poll_seconds"] <= 30:
        raise ValueError("poll_seconds must be between 15 and 30")
    if cfg["request_spacing_seconds"] < 1 or not 1 <= cfg["timeout_seconds"] <= 60:
        raise ValueError("Use >=1 second SEC request spacing and a 1-60 second timeout")
    if not 1024 <= cfg["scan_max_bytes"] <= 16 * 1024 * 1024:
        raise ValueError("scan_max_bytes must be 1 KiB to 16 MiB")
    if set(cfg["companies"]) != {"0001318605", "0001181412"}:
        raise ValueError("This package expects both configured target CIKs")
    if cfg["smtp"]["security"] not in ("starttls", "ssl"):
        raise ValueError("SMTP security must be starttls or ssl")
    if not isinstance(cfg["smtp"]["to"], list) or not cfg["smtp"]["to"]:
        raise ValueError("smtp.to must be a nonempty list")
    return cfg


def retry_after(value):
    try:
        return max(0, float(value))
    except (TypeError, ValueError):
        try:
            return max(0, email.utils.parsedate_to_datetime(value).timestamp() - time.time())
        except (TypeError, ValueError, OverflowError):
            return 0


class SecClient:
    def __init__(self, cfg):
        self.cfg = cfg
        self.next_request = 0
        self.failures = 0
        self.blocked_until = 0

    def get(self, url, limit=16 * 1024 * 1024):
        parsed = urllib.parse.urlsplit(url)
        if parsed.scheme != "https" or parsed.hostname not in {"www.sec.gov", "data.sec.gov"}:
            raise ValueError("Only official SEC HTTPS endpoints are allowed")
        if time.monotonic() < self.blocked_until:
            raise RuntimeError("SEC cooldown active; no request sent")
        time.sleep(max(0, self.next_request - time.monotonic()))
        self.next_request = time.monotonic() + self.cfg["request_spacing_seconds"]
        req = urllib.request.Request(url, headers={
            "User-Agent": self.cfg["user_agent"], "Accept-Encoding": "identity",
            "Accept": "application/json, application/atom+xml, text/plain, text/html, */*"})
        try:
            with urllib.request.urlopen(req, timeout=self.cfg["timeout_seconds"]) as resp:
                data = resp.read(limit + 1)
                result = (data[:limit], len(data) > limit)
            self.failures = 0
            return result
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            self.failures += 1
            status = getattr(exc, "code", None)
            headers = getattr(exc, "headers", {}) or {}
            delay = min(1800, 30 * 2 ** min(self.failures - 1, 6))
            if status in (403, 429):
                delay = max(600, delay)
            delay = max(delay, retry_after(headers.get("Retry-After"))) + random.uniform(0, 5)
            self.blocked_until = time.monotonic() + delay
            LOG.warning("SEC request failed (%s); global cooldown %.0fs", status or type(exc).__name__, delay)
            raise


def submissions_url(cik):
    return f"https://data.sec.gov/submissions/CIK{cik}.json"


def rss_url(cik):
    return "https://www.sec.gov/cgi-bin/browse-edgar?" + urllib.parse.urlencode({
        "action": "getcompany", "CIK": cik, "owner": "include", "count": 100, "output": "atom"})


def parse_submissions(data, cik):
    obj = json.loads(data)
    if int(obj["cik"]) != int(cik):
        raise ValueError("SEC response CIK mismatch")
    rows = obj["filings"]["recent"]
    accessions = rows["accessionNumber"]
    for key in ("form", "filingDate", "primaryDocument"):
        if len(rows[key]) != len(accessions):
            raise ValueError("Malformed submissions arrays")
    result = []
    for i, acc in enumerate(accessions):
        if not ACC.fullmatch(acc):
            raise ValueError("Invalid accession")
        root = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc.replace('-', '')}/"
        result.append({"cik": cik, "name": obj["name"], "acc": acc,
                       "form": rows["form"][i], "date": rows["filingDate"][i],
                       "index": root + acc + "-index.html", "text": root + acc + ".txt"})
    return result


def parse_rss(data):
    root = ET.fromstring(data)
    ns = {"a": "http://www.w3.org/2005/Atom"}
    if root.tag != "{http://www.w3.org/2005/Atom}feed":
        raise ValueError("Expected Atom feed")
    result = set()
    for entry in root.findall("a:entry", ns):
        match = ACC.search(ET.tostring(entry, encoding="unicode"))
        if not match:
            raise ValueError("Atom entry lacks accession")
        result.add(match.group())
    return result


def form_reasons(form, cfg):
    base = form.upper().removesuffix("/A")
    return ["watch form: " + form] if base in cfg["priority_forms"] else []


def keyword_hits(data, cfg):
    text = html.unescape(re.sub(r"<[^>]*>", " ", data.decode("utf-8", errors="replace")))
    text = re.sub(r"\s+", " ", text).casefold()
    return [word for word in cfg["keywords"]
            if re.search(r"(?<!\w)" + re.escape(word.casefold()) + r"(?!\w)", text)]


class Store:
    def __init__(self, path):
        self.db = sqlite3.connect(path)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS initialized(cik TEXT PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS filings(
          cik TEXT, acc TEXT, payload TEXT NOT NULL, scan_done INTEGER NOT NULL,
          scan_attempts INTEGER NOT NULL DEFAULT 0, scan_after REAL NOT NULL DEFAULT 0,
          PRIMARY KEY(cik,acc));
        CREATE TABLE IF NOT EXISTS outbox(
          id INTEGER PRIMARY KEY, event_key TEXT UNIQUE, subject TEXT, body TEXT,
          sent_at TEXT, attempts INTEGER DEFAULT 0, next_try REAL DEFAULT 0);
        """)

    def enqueue(self, key, subject, body):
        self.db.execute("INSERT OR IGNORE INTO outbox(event_key,subject,body) VALUES(?,?,?)", (key, subject, body))

    def ingest(self, cik, rows, cfg):
        with self.db:
            baseline = not self.db.execute("SELECT 1 FROM initialized WHERE cik=?", (cik,)).fetchone()
            for row in reversed(rows):
                cur = self.db.execute("INSERT OR IGNORE INTO filings(cik,acc,payload,scan_done) VALUES(?,?,?,?)",
                                      (cik, row["acc"], json.dumps(row), int(baseline or not cfg["scan_documents"])))
                if cur.rowcount and not baseline:
                    reasons = form_reasons(row["form"], cfg)
                    if cfg["alert_all_new"] or reasons:
                        self.alert(row, "new", reasons)
            self.db.execute("INSERT OR IGNORE INTO initialized VALUES(?)", (cik,))
        if baseline:
            LOG.info("Baseline %s: %d existing filings; no historical emails", cik, len(rows))

    def alert(self, row, kind, reasons):
        subject = f"[EDGAR {'REVIEW' if reasons else 'NEW'}] {row['name']} {row['form']} {row['acc']}"
        body = (f"Observed UTC: {utc()}\nCompany: {row['name']}\nCIK: {row['cik']}\n"
                f"Form: {row['form']}\nFiled: {row['date']}\nAccession: {row['acc']}\n"
                f"Reasons: {', '.join(reasons) or 'new filing'}\n{row['index']}\n\n"
                "Review signal only. This does not establish a merger or a transaction between the two companies.")
        self.enqueue(f"{row['cik']}:{row['acc']}:{kind}", subject, body)

    def scan(self, client, cfg):
        # One document per cycle bounds load; durable backlog resumes on restart.
        pending = self.db.execute("SELECT cik,acc,payload,scan_attempts FROM filings WHERE scan_done=0 AND scan_after<=? ORDER BY rowid LIMIT 1", (time.time(),)).fetchone()
        if not pending:
            return
        cik, acc, payload, attempts = pending
        row = json.loads(payload)
        try:
            data, truncated = client.get(row["text"], cfg["scan_max_bytes"])
            hits = keyword_hits(data, cfg)
            with self.db:
                if hits:
                    self.alert(row, "keywords", ["text keyword: " + h for h in hits] + (["scan truncated"] if truncated else []))
                self.db.execute("UPDATE filings SET scan_done=1 WHERE cik=? AND acc=?", (cik, acc))
            LOG.info("Scanned %s; keywords=%s truncated=%s", acc, hits, truncated)
        except Exception:
            with self.db:
                self.db.execute("UPDATE filings SET scan_attempts=scan_attempts+1,scan_after=? WHERE cik=? AND acc=?",
                                (time.time() + min(3600, 60 * 2 ** min(attempts, 6)), cik, acc))
            LOG.warning("Document scan deferred for %s", acc)


def send_email(cfg, subject, body, event_id):
    conf = cfg["smtp"]
    password = os.environ.get(conf["password_env"])
    if conf.get("username") and not password:
        raise ValueError("SMTP password environment variable is missing")
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = conf["from"], ", ".join(conf["to"]), subject
    msg["Date"] = email.utils.formatdate(localtime=False)
    msg["Message-ID"] = f"<{event_id}@sec-monitor.local>"
    msg.set_content(body)
    context = ssl.create_default_context()
    cls = smtplib.SMTP_SSL if conf["security"] == "ssl" else smtplib.SMTP
    kwargs = {"context": context} if conf["security"] == "ssl" else {}
    with cls(conf["host"], int(conf["port"]), timeout=20, **kwargs) as smtp:
        smtp.ehlo()
        if conf["security"] == "starttls":
            smtp.starttls(context=context)
            smtp.ehlo()
        if conf.get("username"):
            smtp.login(conf["username"], password)
        refused = smtp.send_message(msg)
        if refused:
            raise RuntimeError("SMTP refused one or more recipients")


def flush(store, cfg):
    pending = store.db.execute("SELECT id,subject,body,attempts FROM outbox WHERE sent_at IS NULL AND next_try<=? ORDER BY id LIMIT 1", (time.time(),)).fetchall()
    for ident, subject, body, attempts in pending:
        try:
            send_email(cfg, subject, body, f"edgar-{ident}-{store.instance_id}")
        except Exception as exc:
            # Avoid logging server responses which may contain account details.
            LOG.error("Email deferred: %s; check SMTP configuration/connectivity", type(exc).__name__)
            with store.db:
                store.db.execute("UPDATE outbox SET attempts=attempts+1,next_try=? WHERE id=?",
                                 (time.time() + min(3600, 30 * 2 ** min(attempts, 7)), ident))
            break
        else:
            with store.db:
                store.db.execute("UPDATE outbox SET sent_at=? WHERE id=?", (utc(), ident))
            LOG.info("Email accepted by SMTP: outbox %s", ident)


def benchmark(client, cfg, directory, rounds):
    directory.mkdir(parents=True, exist_ok=True)
    seen, baseline, timings, initialized_sources = {}, set(), {}, set()
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    with (directory / f"requests-{stamp}.csv").open("w", newline="", encoding="utf-8") as rf, (directory / f"visibility-{stamp}.csv").open("w", newline="", encoding="utf-8") as vf:
        rw, vw = csv.writer(rf), csv.writer(vf)
        rw.writerow(["utc", "round", "cik", "source", "seconds", "bytes", "count", "status"])
        vw.writerow(["cik", "accession", "json_first_utc", "rss_first_utc", "rss_minus_json_seconds"])
        for n in range(rounds):
            start = time.monotonic()
            for cik in cfg["companies"]:
                sources = ["json", "rss"] if n % 2 == 0 else ["rss", "json"]
                for source in sources:
                    before = time.monotonic()
                    try:
                        data, truncated = client.get(submissions_url(cik) if source == "json" else rss_url(cik))
                        if truncated:
                            raise ValueError("Truncated response")
                        ids = {r["acc"] for r in parse_submissions(data, cik)} if source == "json" else parse_rss(data)
                        elapsed = time.monotonic() - before
                        timings.setdefault(source, []).append(elapsed)
                        rw.writerow([utc(), n, cik, source, round(elapsed, 4), len(data), len(ids), "ok"])
                        for acc in ids:
                            key = (cik, acc)
                            if (cik, source) not in initialized_sources:
                                baseline.add(key)
                            seen.setdefault(key, {}).setdefault(source, time.time())
                        initialized_sources.add((cik, source))
                    except Exception as exc:
                        rw.writerow([utc(), n, cik, source, round(time.monotonic()-before, 4), "", "", type(exc).__name__])
                        LOG.warning("Benchmark %s %s unavailable: %s", cik, source, type(exc).__name__)
                    rf.flush()
            if n + 1 < rounds:
                time.sleep(max(0, cfg["poll_seconds"] - (time.monotonic()-start)))
        for (cik, acc), observations in sorted(seen.items()):
            if (cik, acc) in baseline:
                continue
            j, r = observations.get("json"), observations.get("rss")
            fmt = lambda t: dt.datetime.fromtimestamp(t, dt.timezone.utc).isoformat() if t else ""
            vw.writerow([cik, acc, fmt(j), fmt(r), round(r-j, 3) if j and r else ""])
    for source, samples in timings.items():
        LOG.info("%s successful requests=%d median=%.3fs max=%.3fs (includes local pacing)", source, len(samples), statistics.median(samples), max(samples))
    LOG.info("Benchmark saved to %s; each source's initial snapshot excluded from visibility results", directory)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["run", "once", "benchmark", "test-email", "status"])
    parser.add_argument("--config", default="config.json")
    parser.add_argument("--rounds", type=int, default=30)
    args = parser.parse_args()
    config_path = Path(args.config).resolve()
    cfg = load_config(config_path)
    root = config_path.parent
    state = root / "state"
    state.mkdir(exist_ok=True)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", handlers=[
        logging.StreamHandler(), RotatingFileHandler(state / "monitor.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8")])
    # Windows releases the socket on process exit, including crashes. All commands share this lock.
    lock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
        lock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
    if args.command != "status":
        try:
            lock.bind(("127.0.0.1", 48137))
        except OSError:
            raise SystemExit("Another monitor command is running (or port 48137 is occupied).")
    client = SecClient(cfg)
    store = Store(state / "monitor.sqlite3")
    # Stable per-database identifier survives restarts without exposing machine/user identity.
    store.db.execute("CREATE TABLE IF NOT EXISTS identity(id TEXT)")
    if not store.db.execute("SELECT id FROM identity").fetchone():
        import uuid
        store.db.execute("INSERT INTO identity VALUES(?)", (uuid.uuid4().hex,))
        store.db.commit()
    store.instance_id = store.db.execute("SELECT id FROM identity").fetchone()[0]
    if args.command == "status":
        print("Pending emails:", store.db.execute("SELECT COUNT(*) FROM outbox WHERE sent_at IS NULL").fetchone()[0])
        print("Pending scans:", store.db.execute("SELECT COUNT(*) FROM filings WHERE scan_done=0").fetchone()[0])
        return
    if args.command == "test-email":
        with store.db:
            store.enqueue("test:" + utc(), "[EDGAR TEST] SMTP setup check", "Your SEC monitor SMTP test. " + utc())
        flush(store, cfg)
        if store.db.execute("SELECT COUNT(*) FROM outbox WHERE sent_at IS NULL").fetchone()[0]:
            raise SystemExit("Some emails remain pending; inspect state/monitor.log")
        return
    if args.command == "benchmark":
        if not 1 <= args.rounds <= 100000:
            raise SystemExit("rounds must be 1-100000")
        benchmark(client, cfg, root / "benchmark", args.rounds)
        return
    while True:
        start = time.monotonic()
        poll_errors = 0
        for cik in cfg["companies"]:
            try:
                data, truncated = client.get(submissions_url(cik))
                if truncated:
                    raise ValueError("Truncated JSON")
                rows = parse_submissions(data, cik)
                store.ingest(cik, rows, cfg)
                LOG.info("Poll OK %s (%s): %d recent filings", cik, rows[0]["name"] if rows else cfg["companies"][cik], len(rows))
            except Exception as exc:
                poll_errors += 1
                LOG.warning("Poll failed %s: %s", cik, type(exc).__name__)
        flush(store, cfg)  # Send metadata alerts before slower document enrichment.
        store.scan(client, cfg)
        flush(store, cfg)
        if args.command == "once":
            if poll_errors:
                raise SystemExit("One or more company polls failed; inspect state/monitor.log")
            return
        elapsed = time.monotonic() - start
        if elapsed > cfg["poll_seconds"]:
            LOG.warning("Cycle took %.1fs; target cadence exceeded", elapsed)
        time.sleep(max(1, cfg["poll_seconds"] - elapsed))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
