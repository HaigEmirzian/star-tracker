import json
import csv
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

import monitor as m

CFG = json.loads((Path(__file__).resolve().parents[1] / "config.example.json").read_text())


def fixture(acc="0001628280-26-000001", form="8-K"):
    return json.dumps({"cik": "1318605", "name": "Tesla, Inc.", "filings": {"recent": {
        "accessionNumber": [acc], "form": [form], "filingDate": ["2026-10-18"],
        "primaryDocument": ["sample.htm"]}}}).encode()


class MonitorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = m.Store(Path(self.tmp.name) / "test.sqlite3")
        self.store.instance_id = "test"

    def tearDown(self):
        self.store.db.close()
        self.tmp.cleanup()

    def count(self):
        return self.store.db.execute("SELECT COUNT(*) FROM outbox").fetchone()[0]

    def seed_new(self):
        self.store.ingest("0001318605", m.parse_submissions(fixture(), "0001318605"), CFG)
        rows = m.parse_submissions(fixture("0001628280-26-000002"), "0001318605")
        self.store.ingest("0001318605", rows, CFG)
        return rows

    def test_baseline_and_repeated_poll(self):
        rows = self.seed_new()
        self.store.ingest("0001318605", rows, CFG)
        self.assertEqual(self.count(), 1)

    def test_restart_retains_outbox_and_dedup(self):
        rows = self.seed_new()
        self.store.db.close()
        self.store = m.Store(Path(self.tmp.name) / "test.sqlite3")
        self.store.ingest("0001318605", rows, CFG)
        self.assertEqual(self.count(), 1)

    def test_baseline_is_independent_per_company(self):
        self.seed_new()
        self.store.ingest("0001181412", [], CFG)
        self.assertEqual(self.count(), 1)
        self.assertEqual(self.store.db.execute("SELECT COUNT(*) FROM initialized").fetchone()[0], 2)

    def test_amendment_form(self):
        self.assertTrue(m.form_reasons("S-4/A", CFG))
        self.assertFalse(m.form_reasons("4", CFG))

    def test_identity_and_schema(self):
        with self.assertRaises(ValueError):
            m.parse_submissions(fixture(), "0001181412")
        broken = json.loads(fixture())
        broken["filings"]["recent"]["form"] = []
        with self.assertRaises(ValueError):
            m.parse_submissions(json.dumps(broken), "0001318605")

    def test_atom(self):
        data = b'<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>urn:tag:accession-number=0001628280-26-000001</id></entry></feed>'
        self.assertEqual(m.parse_rss(data), {"0001628280-26-000001"})
        with self.assertRaises(ValueError):
            m.parse_rss(b"<html>blocked</html>")

    def test_keywords_normalize_html(self):
        self.assertIn("business combination", m.keyword_hits(b"business <b>combination</b>", CFG))
        self.assertNotIn("merger", m.keyword_hits(b"mergersomething", CFG))

    def test_smtp_failure_remains_pending(self):
        self.seed_new()
        with patch.object(m, "send_email", side_effect=OSError("down")):
            m.flush(self.store, CFG)
        row = self.store.db.execute("SELECT sent_at,attempts,next_try FROM outbox").fetchone()
        self.assertIsNone(row[0])
        self.assertEqual(row[1], 1)
        self.assertGreater(row[2], 0)

    def test_smtp_success_not_resent(self):
        self.seed_new()
        with patch.object(m, "send_email") as send:
            m.flush(self.store, CFG)
            m.flush(self.store, CFG)
            self.assertEqual(send.call_count, 1)

    def test_document_retry_and_keyword_dedup(self):
        self.seed_new()
        client = unittest.mock.Mock()
        client.get.side_effect = OSError("down")
        self.store.scan(client, CFG)
        row = self.store.db.execute("SELECT scan_done,scan_attempts FROM filings WHERE acc LIKE '%000002'").fetchone()
        self.assertEqual(row, (0, 1))
        self.store.db.execute("UPDATE filings SET scan_after=0")
        self.store.db.commit()
        client.get.side_effect = None
        client.get.return_value = (b"agreement and plan of merger", False)
        self.store.scan(client, CFG)
        self.store.scan(client, CFG)
        self.assertEqual(self.count(), 2)

    def test_sec_block_cools_all_hosts(self):
        client = m.SecClient(CFG)
        error = urllib.error.HTTPError("https://data.sec.gov", 429, "blocked", {"Retry-After": "900"}, None)
        with patch.object(m.urllib.request, "urlopen", side_effect=error) as request:
            with self.assertRaises(urllib.error.HTTPError):
                client.get(m.submissions_url("0001318605"))
            with self.assertRaises(RuntimeError):
                client.get(m.rss_url("0001181412"))
            self.assertEqual(request.call_count, 1)
        self.assertGreaterEqual(client.blocked_until - m.time.monotonic(), 899)

    def test_request_spacing(self):
        client = m.SecClient(CFG)
        client.next_request = 102
        response = unittest.mock.MagicMock()
        response.__enter__.return_value.read.return_value = b"{}"
        with patch.object(m.time, "monotonic", return_value=100), patch.object(m.time, "sleep") as sleep, patch.object(m.urllib.request, "urlopen", return_value=response):
            client.get(m.submissions_url("0001318605"))
            sleep.assert_called_once_with(2)

    def test_retry_after(self):
        self.assertEqual(m.retry_after("600"), 600)
        self.assertEqual(m.retry_after("invalid"), 0)
        with patch.object(m.time, "time", return_value=0):
            self.assertEqual(m.retry_after("Thu, 01 Jan 1970 00:10:00 GMT"), 600)

    def test_benchmark_visibility_and_order(self):
        old = "0001628280-26-000001"
        new = "0001628280-26-000002"
        calls = []
        counts = {"json": 0, "rss": 0}
        def get(url):
            source = "json" if "data.sec.gov" in url else "rss"
            calls.append(source)
            counts[source] += 1
            if source == "json":
                data = json.loads(fixture())
                if counts[source] > 1:
                    recent = data["filings"]["recent"]
                    for key, value in [("accessionNumber", new), ("form", "S-4"), ("filingDate", "2026-10-18"), ("primaryDocument", "new.htm")]:
                        recent[key].append(value)
                return json.dumps(data).encode(), False
            ids = [old] + ([new] if counts[source] > 1 else [])
            feed = '<feed xmlns="http://www.w3.org/2005/Atom">' + ''.join('<entry><id>' + acc + '</id></entry>' for acc in ids) + '</feed>'
            return feed.encode(), False
        cfg = dict(CFG, companies={"0001318605": "Tesla, Inc."})
        client = unittest.mock.Mock()
        client.get.side_effect = get
        directory = Path(self.tmp.name) / "benchmark"
        with patch.object(m.time, "sleep"):
            m.benchmark(client, cfg, directory, 2)
        self.assertEqual(calls, ["json", "rss", "rss", "json"])
        with next(directory.glob("visibility-*.csv")).open(newline="") as stream:
            rows = list(csv.DictReader(stream))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["accession"], new)
        self.assertTrue(rows[0]["json_first_utc"])
        self.assertTrue(rows[0]["rss_first_utc"])


if __name__ == "__main__":
    unittest.main()
