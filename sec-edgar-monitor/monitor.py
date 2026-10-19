"""Tesla + SpaceX SEC monitor. Run this file with Python 3.9+ to open setup.

Enter your email, SMTP server and app password, test email, then start.
Keep the window open and PC awake.Filing history and logs are saved in state/
beside this script. Standard library only; Python must include tkinter, SQLite and SSL.
"""
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
import sys
import time
import urllib.error
import urllib.request

import copy
import queue
import subprocess
import threading
import tkinter as tk
from tkinter import messagebox, ttk
from tkinter.scrolledtext import ScrolledText

LOG = logging.getLogger("edgar")
ACC = re.compile(r"\d{10}-\d{2}-\d{6}")


def utc():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def validate_config(cfg):
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
        subject = "BREAKING NEWS: Tesla/SpaceX Merger Filed"
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


def run_worker(command, cfg):
    root = ROOT
    state = root / "state"
    state.mkdir(exist_ok=True)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", handlers=[
        logging.StreamHandler(), RotatingFileHandler(state / "monitor.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8")])
    # Windows releases the socket on process exit, including crashes. All commands share this lock.
    lock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
        lock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
    if command != "status":
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
    if command == "status":
        print("Pending emails:", store.db.execute("SELECT COUNT(*) FROM outbox WHERE sent_at IS NULL").fetchone()[0])
        print("Pending scans:", store.db.execute("SELECT COUNT(*) FROM filings WHERE scan_done=0").fetchone()[0])
        return
    if command == "test-email":
        with store.db:
            store.enqueue("test:" + utc(), "[EDGAR TEST] SMTP setup check", "Your SEC monitor SMTP test. " + utc())
        flush(store, cfg)
        if store.db.execute("SELECT COUNT(*) FROM outbox WHERE sent_at IS NULL").fetchone()[0]:
            raise SystemExit("Some emails remain pending; inspect state/monitor.log")
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
        if command == "once":
            if poll_errors:
                raise SystemExit("One or more company polls failed; inspect state/monitor.log")
            return
        elapsed = time.monotonic() - start
        if elapsed > cfg["poll_seconds"]:
            LOG.warning("Cycle took %.1fs; target cadence exceeded", elapsed)
        time.sleep(max(1, cfg["poll_seconds"] - elapsed))


DEFAULT_CONFIG = {'user_agent': '',
 'poll_seconds': 20,
 'request_spacing_seconds': 1.0,
 'timeout_seconds': 15,
 'companies': {'0001318605': 'Tesla, Inc.', '0001181412': 'Space Exploration Technologies Corp.'},
 'alert_all_new': True,
 'scan_documents': True,
 'scan_max_bytes': 8388608,
 'priority_forms': ['8-K',
                    '6-K',
                    'S-4',
                    'F-4',
                    '425',
                    'PREM14A',
                    'DEFM14A',
                    'SC TO-T',
                    'SC TO-I',
                    'SC 14D9',
                    'SC 13E3'],
 'keywords': ['merger',
              'agreement and plan of merger',
              'business combination',
              'acquisition',
              'tender offer',
              'exchange offer',
              'change of control'],
 'smtp': {'host': '',
          'port': 587,
          'security': 'starttls',
          'username': '',
          'password_env': 'SEC_SMTP_PASSWORD',
          'from': '',
          'to': []}}

ROOT = Path(__file__).resolve().parent


def saved_credentials(path):
    """Read only the two monitor values; never execute or expand file contents."""
    values = {}
    if path.exists():
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            key, separator, value = line.strip().partition('=')
            key = key.strip()
            if separator and key in ('SEC_EMAIL', 'SEC_SMTP_PASSWORD'):
                value = value.strip()
                if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
                    value = value[1:-1]
                values[key] = value
    return {key: os.environ.get(key) or values.get(key, '')
            for key in ('SEC_EMAIL', 'SEC_SMTP_PASSWORD')}


PROVIDERS = {
    'gmail.com': ('Gmail', 'smtp.gmail.com', 587, 'starttls'),
    'googlemail.com': ('Gmail', 'smtp.gmail.com', 587, 'starttls'),
    'yahoo.com': ('Yahoo', 'smtp.mail.yahoo.com', 465, 'ssl'),
    'icloud.com': ('iCloud', 'smtp.mail.me.com', 587, 'starttls'),
    'me.com': ('iCloud', 'smtp.mail.me.com', 587, 'starttls'),
    'mac.com': ('iCloud', 'smtp.mail.me.com', 587, 'starttls'),
}


def session_config(base, values):
    """Use one email for SEC contact, sending, login, and receiving alerts."""
    cfg = copy.deepcopy(base)
    email = values['contact'].strip()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise ValueError('Enter a valid email address.')
    cfg['user_agent'] = 'PersonalSECMonitor ' + email
    smtp = cfg['smtp']
    smtp.update(username=email, **{'from': email, 'to': [email]})
    for key in ('host', 'security'):
        smtp[key] = values[key].strip()
    if not smtp['host']:
        raise ValueError('Could not detect your email provider. Open Advanced and enter its mail server settings.')
    smtp['port'] = int(values['port'])
    if not 1 <= smtp['port'] <= 65535:
        raise ValueError('Mail server port must be between 1 and 65535.')
    return validate_config(cfg)


class App:
    def __init__(self, window):
        self.window = window
        self.process = None
        self.events = queue.Queue()
        self.stopping = False
        self.command = None
        self.cfg = copy.deepcopy(DEFAULT_CONFIG)
        window.title('Tesla + SpaceX SEC Monitor')
        window.geometry('780x600')
        panel = ttk.Frame(window, padding=18)
        panel.pack(fill='both', expand=True)
        panel.columnconfigure(1, weight=1)
        ttk.Label(panel, text='Tesla + SpaceX SEC Monitor', font=('Segoe UI', 18, 'bold')).grid(
            row=0, column=0, columnspan=2, sticky='w')
        ttk.Label(panel, text='Set up email, test delivery, then start. Keep this window open and your PC awake.').grid(
            row=1, column=0, columnspan=2, sticky='w', pady=(6, 14))
        self.fields = {}
        self.inputs = []

        def field(parent, row, key, label, default=''):
            ttk.Label(parent, text=label).grid(row=row, column=0, sticky='w', padx=(0, 14), pady=5)
            var = tk.StringVar(value=str(default))
            self.fields[key] = var
            if key == 'security':
                entry = ttk.Combobox(parent, textvariable=var, values=('starttls', 'ssl'), state='readonly')
            else:
                entry = ttk.Entry(parent, textvariable=var, show='*' if key == 'password' else '')
            entry.grid(row=row, column=1, sticky='ew', pady=5)
            self.inputs.append((entry, key))

        field(panel, 2, 'contact', 'Email')
        field(panel, 3, 'password', 'App password')
        self.provider_hint = tk.StringVar(value='Server settings are automatic for Gmail, Yahoo, and iCloud.')
        ttk.Label(panel, textvariable=self.provider_hint, wraplength=700).grid(
            row=4, column=0, columnspan=2, sticky='w', pady=6)
        self.advanced = ttk.Frame(panel)
        self.advanced.grid(row=6, column=0, columnspan=2, sticky='ew')
        self.advanced.columnconfigure(1, weight=1)
        field(self.advanced, 0, 'host', 'Mail server')
        field(self.advanced, 1, 'port', 'Port', 587)
        field(self.advanced, 2, 'security', 'Connection', 'starttls')
        self.advanced.grid_remove()
        self.advanced_button = ttk.Button(panel, text='Advanced', command=self.toggle_advanced)
        self.advanced_button.grid(row=5, column=0, columnspan=2, sticky='w', pady=4)
        self.fields['contact'].trace_add('write', self.fill_email)
        credentials = saved_credentials(ROOT.parent / '.env')
        self.fields['contact'].set(credentials['SEC_EMAIL'])
        self.fields['password'].set(credentials['SEC_SMTP_PASSWORD'])
        ttk.Label(panel, text='Alerts go to the same email. Optional saved credentials load from the repo .env.\n'
                  'Use an app password from your email account settings, not your usual sign-in password.',
                  wraplength=700).grid(row=7, column=0, columnspan=2, sticky='w', pady=(6, 12))
        buttons = ttk.Frame(panel)
        buttons.grid(row=8, column=0, columnspan=2, sticky='w')
        self.actions = []
        for label, command in [('Test email', lambda: self.launch('test-email')),
                               ('Start monitoring', lambda: self.launch('run'))]:
            button = ttk.Button(buttons, text=label, command=command)
            button.pack(side='left', padx=(0, 8))
            self.actions.append(button)
        self.stop_button = ttk.Button(buttons, text='Stop', command=self.stop, state='disabled')
        self.stop_button.pack(side='left')
        self.status = tk.StringVar(value='Ready. Using Python ' + sys.version.split()[0])
        ttk.Label(panel, textvariable=self.status).grid(row=9, column=0, columnspan=2, sticky='w', pady=10)
        self.output = ScrolledText(panel, height=12, state='disabled', wrap='word')
        self.output.grid(row=10, column=0, columnspan=2, sticky='nsew')
        panel.rowconfigure(10, weight=1)
        ttk.Label(panel, text='First successful check establishes a baseline without historical alerts.\n'
                  'Alerts flag filings for review; they do not confirm a merger.').grid(
            row=11, column=0, columnspan=2, sticky='w', pady=(12, 0))
        window.protocol('WM_DELETE_WINDOW', self.close)
        window.after(100, self.drain)

    def toggle_advanced(self):
        if self.advanced.winfo_manager():
            self.advanced.grid_remove()
            self.advanced_button.configure(text='Advanced')
        else:
            self.advanced.grid()
            self.advanced_button.configure(text='Hide advanced')

    def fill_email(self, *_):
        domain = self.fields['contact'].get().strip().rpartition('@')[2].lower()
        provider = PROVIDERS.get(domain)
        if provider:
            name, host, port, security = provider
            self.fields['host'].set(host)
            self.fields['port'].set(str(port))
            self.fields['security'].set(security)
            self.provider_hint.set(name + ' detected. Use an app password from your account settings.')
        else:
            self.fields['host'].set('')
            self.fields['port'].set('587')
            self.fields['security'].set('starttls')
            self.provider_hint.set('Other provider? Open Advanced to enter its mail server settings.')

    def prepare(self):
        try:
            self.cfg = session_config(self.cfg, {k: v.get() for k, v in self.fields.items()})
        except (ValueError, KeyError, OSError) as exc:
            messagebox.showerror('Check settings', str(exc), parent=self.window)
            return False
        return True

    def set_busy(self, busy):
        for button in self.actions + [self.advanced_button]:
            button.configure(state='disabled' if busy else 'normal')
        for entry, key in self.inputs:
            entry.configure(state='disabled' if busy else ('readonly' if key == 'security' else 'normal'))
        self.stop_button.configure(state='normal' if busy else 'disabled')

    def launch(self, command):
        if self.process is not None or not self.prepare():
            return
        env = os.environ.copy()
        password = self.fields['password'].get()
        if password:
            env[self.cfg['smtp']['password_env']] = password
        if self.cfg['smtp']['username'] and not env.get(self.cfg['smtp']['password_env']):
            messagebox.showerror('Password needed', 'Enter your email app password first.', parent=self.window)
            return
        env['PYTHONIOENCODING'] = 'utf-8'
        try:
            self.process = subprocess.Popen(
                [sys.executable, '-u', str(Path(__file__).resolve()), '--worker', command],
                cwd=ROOT, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, encoding='utf-8', errors='replace',
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
            self.process.stdin.write(json.dumps(self.cfg))
            self.process.stdin.close()
        except OSError as exc:
            if self.process is not None:
                self.process.terminate()
                self.process.wait()
                self.process = None
            messagebox.showerror('Unable to start', str(exc), parent=self.window)
            return
        self.stopping = False
        self.command = command
        self.set_busy(True)
        self.status.set('Monitoring started. Check the log below for Poll OK for both companies.'
                        if command == 'run' else 'Testing email delivery...')
        threading.Thread(target=self.read_output, args=(self.process,), daemon=True).start()

    def read_output(self, process):
        try:
            for line in process.stdout:
                self.events.put(('line', line))
        finally:
            process.stdout.close()
            self.events.put(('done', process.wait()))

    def drain(self):
        try:
            while True:
                kind, value = self.events.get_nowait()
                if kind == 'line':
                    self.output.configure(state='normal')
                    self.output.insert('end', value)
                    if int(self.output.index('end-1c').split('.')[0]) > 1000:
                        self.output.delete('1.0', '101.0')
                    self.output.see('end')
                    self.output.configure(state='disabled')
                else:
                    self.process = None
                    self.set_busy(False)
                    if self.stopping:
                        self.status.set('Stopped. Filing history and pending alerts are saved.')
                    elif value == 0 and self.command == 'test-email':
                        self.status.set('Email accepted by server. Check your inbox and spam folder.')
                    else:
                        self.status.set('Monitor exited. Review the log below for details.')
        except queue.Empty:
            pass
        self.window.after(100, self.drain)

    def stop(self):
        if self.process is not None and self.process.poll() is None:
            self.stopping = True
            self.process.terminate()
            self.status.set('Stopping...')
            self.stop_button.configure(state='disabled')

    def close(self):
        self.stop()
        if self.process is not None:
            self.process.wait(timeout=5)
        self.window.destroy()


def open_window():
    window = tk.Tk()
    window.withdraw()
    try:
        app = App(window)
    except Exception as exc:
        messagebox.showerror('Unable to open SEC Monitor', str(exc), parent=window)
        window.destroy()
    else:
        window.deiconify()
        window.mainloop()


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--worker':
        try:
            run_worker(sys.argv[2], validate_config(json.load(sys.stdin)))
        except KeyboardInterrupt:
            pass
    else:
        open_window()
