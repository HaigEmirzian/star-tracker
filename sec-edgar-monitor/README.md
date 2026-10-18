# Tesla + SpaceX SEC EDGAR monitor for Windows

Python 3.11 or newer; standard library only. No pip packages, API keys, or paid data service required. The package is ready to configure; it has not been installed as an active task or connected to your email account.

## 1. Set up Python and configuration

Extract the ZIP to a permanent local folder, for example `C:\SECMonitor`. Avoid a network drive or a cloud-synced folder for SQLite. Install Python 3.11+ if `py --version` does not work. In PowerShell, change into that folder:

```powershell
Set-Location C:\SECMonitor
py -3 -m venv .venv
Copy-Item config.example.json config.json
notepad config.json
```

Replace `user_agent` with your real name/application and reachable contact email, for example `Jane Doe PersonalEDGARMonitor jane@mydomain.com`. Replace every SMTP placeholder. Keep both CIKs as strings with leading zeroes. Default polling is 20 seconds; allowed range is 15–30. Requests across both SEC hosts, all companies, documents, and benchmarking are spaced at least 1 second apart in this process. Only one requesting command can run at a time on this Windows host (loopback port 48137). `status` can run alongside it.

The limit applies to your other SEC tools and machines too. This package cannot coordinate unrelated software or other PCs sharing your internet connection. Keep the combined traffic below the SEC limit; do not run duplicate monitor copies on other machines.

## 2. Configure email

Use your mail provider's SMTP host and either port 587 with `"security": "starttls"`, or port 465 with `"security": "ssl"`, as supported by that provider. TLS certificates are verified. `username` normally equals the full account address. `from` must be an address the account can send as. `to` is a JSON list of recipient addresses. Password-based SMTP must be enabled for the account; providers requiring OAuth-only SMTP need an OAuth-capable mail relay or an adaptation of this sender. An app password may be required where supported.

Set the password without placing it in config or shell history:

```powershell
$Secret = Read-Host 'SMTP app password' -AsSecureString
$env:SEC_SMTP_PASSWORD = [System.Net.NetworkCredential]::new('', $Secret).Password
Remove-Variable Secret
.\.venv\Scripts\python.exe monitor.py test-email --config config.json
```

Check the inbox and spam folder. Success means the SMTP server accepted the message, not guaranteed inbox delivery. `test-email` also attempts delivery of one existing queued message if present; use a fresh setup for the initial test.

For Task Scheduler to inherit the password after reboot, store it in the **same Windows user's** environment. This is persistent plaintext account configuration, accessible to software running as that user; use an app-specific password and protect your Windows account. It is not a credential vault. From the same session where the test worked:

```powershell
[Environment]::SetEnvironmentVariable('SEC_SMTP_PASSWORD', $env:SEC_SMTP_PASSWORD, 'User')
```

Sign out and back in (or reboot) before starting the scheduled task so its environment contains the new value. Do this again after changing the saved password. Never put passwords in task arguments. To remove the saved value later:

```powershell
[Environment]::SetEnvironmentVariable('SEC_SMTP_PASSWORD', $null, 'User')
```

## 3. Establish baseline and run

```powershell
.\.venv\Scripts\python.exe monitor.py once --config config.json
.\.venv\Scripts\python.exe monitor.py run --config config.json
```

The first successful JSON snapshot for **each company separately** records all currently returned filings without historical email or document scans. Start this baseline as soon as you are ready: filings already present at baseline will not generate alerts. An unsuccessful poll never marks that company initialized. Later polls compare all returned accessions and insert new ones transactionally with their notification records. Ctrl+C stops the foreground monitor. The state survives a normal exit or crash.

Default behavior:

* Every new filing produces a `NEW` email, or `REVIEW` if its form is on the watch list. No forms are excluded, including ownership forms.
* The watch list includes 8-K, 6-K, S-4, F-4, 425, merger proxies, tender-offer and going-private forms. `/A` amendments match their base forms and have their own accession.
* One new filing per cycle is subsequently scanned via the complete submission `.txt`, which can include textual exhibits. Keyword hits produce a separate `REVIEW` follow-up email. This second event is intentional.
* Scans inspect only the first 8 MiB by default (configurable up to 16 MiB). Truncation is logged and marked on a keyword alert. Embedded binary/PDF/image content is not decoded or OCR'd. HTML tags are removed and whitespace normalized for simple phrase matching.
* `alert_all_new: false` suppresses ordinary metadata emails but retains watch-form emails and keyword follow-ups. `scan_documents: false` disables new text scans. Existing queued scans continue unless manually addressed in the database.

The keywords are broad and will match routine disclosures, hypothetical risks, boilerplate, and unrelated acquisitions. An 8-K form alone says nothing about a merger. Alerts are review prompts, never a conclusion that Tesla and SpaceX are combining. Company names are omitted from default keywords because a company normally mentions itself; you can add names, accepting that extra noise. This monitor only covers filings appearing under the two CIKs, not new entities, subsidiaries, third-party acquirers, confidential submissions, news, or rumors.

## 4. Compare RSS/Atom with submissions JSON

Stop the normal monitor before benchmarking. Benchmark mode observes both companies and sources without changing the filing baseline, scanning documents, or sending email. It is a temporary diagnostic, not a second alert channel.

```powershell
.\.venv\Scripts\python.exe monitor.py benchmark --config config.json --rounds 90
```

At 20 seconds this takes roughly 30 minutes. Every round requests JSON and the company Atom feed (ownership included, latest 100 entries) for both companies. The source order alternates to reduce systematic ordering bias. The same SEC limiter and cooldown apply. Files in `benchmark/`:

| File | Meaning |
| --- | --- |
| `requests-<UTC>.csv` | Time, CIK, source, elapsed seconds, bytes, filing count, success/error class |
| `visibility-<UTC>.csv` | First observed UTC time by source for accessions new after the initial snapshots |

The logged median/max elapsed times include local rate pacing plus transfer/read time, excluding parsing. They are not pure network latency. Each source's first successful snapshot is excluded from visibility comparisons, including a delayed first success after errors. Positive `rss_minus_json_seconds` means JSON was observed first. Blank means the other source did not expose the accession during the run, not infinite latency. A header-only visibility CSV means there was no eligible new filing during the sample.

Polling interval, sequential requests, cache behavior, outages, and the RSS 100-entry window limit precision. This is observed visibility, not authoritative publication latency. A short run with no new filings cannot identify the fastest publication source. JSON is the default because it is documented for real-time company submissions and provides a larger recent history window. RSS/Atom is a pull feed and still requires polling; it does not push an instantaneous alert to this program. There are no measured live performance claims bundled with this package: run this with your own declared contact and network.

## 5. Windows Task Scheduler

After the email test and baseline succeed, stop any foreground run. In PowerShell in the installation folder:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install-task.ps1
Start-ScheduledTask -TaskName 'SEC EDGAR Monitor'
Get-ScheduledTaskInfo -TaskName 'SEC EDGAR Monitor'
Get-Content .\state\monitor.log -Tail 30
```

The script creates a task under the current Windows user, starts at that user's logon, quotes paths, ignores duplicate launches, sets no runtime limit, permits battery operation, and requests restart after a process failure every minute (up to 999 attempts). It refuses to replace an existing task of the same name. It does not start the task automatically. The default executable is `.venv\Scripts\python.exe`; an absolute executable/config path can be provided with `-PythonExe` / `-ConfigPath`.

**For unattended operation after reboot without signing in**, open Task Scheduler (`taskschd.msc`) and edit `SEC EDGAR Monitor`:

1. General: select **Run whether user is logged on or not** under the same account that owns the SMTP environment setting. Supply the Windows account password when saving (a Windows Hello PIN is not that password). Leave **Do not store password** unchecked so the task can use network resources. Administrator privileges are unnecessary for the Python monitor.
2. Triggers: add **At startup**, optionally with a 1-minute delay for networking. Keep the logon trigger as a fallback; duplicate task launches are ignored.
3. Conditions: remove idle and AC-power restrictions if present. Settings: verify **Stop the task if it runs longer than** is disabled and restart on failure is enabled.
4. Windows power settings: disable sleep/hibernate while you need monitoring, keep power and internet available, and prevent the laptop lid from suspending the PC. Wake timers alone do not provide continuous monitoring.
5. Reboot and verify fresh `Poll OK` lines for both companies **before relying on it**. Also test sign-out behavior and an SMTP test from the scheduled user's environment.

An always-awake Windows PC is required for 24/7 polling. Windows updates, shutdown, internet loss, sleep, SEC failures, and SMTP outages all create delays. The program runs across weekends and nights; SEC acceptance/dissemination schedules still apply. The 15–30-second setting is the target cycle time, not a delivery guarantee: slow SEC responses, document transfers, and SMTP timeouts can extend a cycle. Overruns are logged. No catch-up request bursts are sent.

## 6. Operation, recovery, and troubleshooting

```powershell
.\.venv\Scripts\python.exe monitor.py status --config config.json
Get-Content .\state\monitor.log -Tail 30
Stop-ScheduledTask -TaskName 'SEC EDGAR Monitor'
Start-ScheduledTask -TaskName 'SEC EDGAR Monitor'
```

`status` reports pending emails and scans and can run while the monitor is active. Fresh per-company `Poll OK` log entries show successful polling; a running Task Scheduler status alone does not establish that network/email access works. Logs rotate at 2 MB with five backups. There is no separate external downtime watchdog in this package; the same PC cannot email you while powered off.

| Symptom | Action |
| --- | --- |
| 403 / 429 | Keep the real contact in User-Agent; stop other SEC crawlers; let the cooldown expire. Do not change IPs to evade blocks. |
| `SEC cooldown active` | No request was sent. All SEC hosts share the cooldown. |
| Email deferred / pending grows | Check the app password, provider authentication policy, sender permission, TLS/port and the task user's environment. Queue stays on disk. |
| Scan pending grows | One document is scanned per cycle; backlog drains slowly after bursts. Failed scans retry independently. |
| Another monitor command running | Stop the task/foreground instance before `once`, `benchmark`, or `test-email`. If none exists, check whether another app occupies loopback port 48137. |
| No historical alerts | Expected baseline behavior. Keep the database to preserve deduplication. |

On SEC transport/HTTP failure, global exponential cooldown begins at 30 seconds and grows up to 30 minutes, plus 0–5 seconds jitter. 403 and 429 impose at least 10 minutes. A longer numeric/date `Retry-After` is honored. Cooldown checks send no network requests. The cooldown resets on a successful HTTP response; parse errors are logged and retried on the normal poll cadence. Cooldown is held in process memory, so do not repeatedly restart during a block.

SQLite keys filings by `(CIK, accession)` and outbox events by `(CIK, accession, event type)`. New filing records and email events commit together. SMTP failures retry with exponential delays up to an hour; the server acceptance time is recorded only after a successful send. A crash or disconnect after server acceptance but before the database commit can cause a repeat. Partial recipient refusal retries the message and can duplicate it for recipients who accepted it earlier. Stable Message-ID values help mail systems identify retries but cannot guarantee exactly-once inbox delivery.

Short outages catch up from the latest JSON recent-filing window. The monitor does **not** automatically download historical JSON pages. SEC documents that the main snapshot contains at least one year or 1,000 recent filings, whichever is more; a sufficiently long outage or high filing volume can exceed that window. Audit missing periods manually if needed. RSS's smaller window is used only for benchmarking. Same-accession corrections/removals do not trigger a new event; new amendment accessions do.

State is in `state/monitor.sqlite3` with SQLite WAL sidecars when active. Stop the task before copying the **whole state folder** for backup. Keep it when upgrading or moving the installation. Deleting state creates a fresh baseline and loses pending mail. Disk failures and permission errors can stop the process; Task Scheduler then attempts restart. Secure the config, database, logs, and saved environment setting under your account.

To uninstall, stop the task, remove it from Task Scheduler, remove the saved SMTP environment variable if no longer needed, and then archive/delete the installation folder when you no longer need its state.

## Verification and official sources

Verified against SEC pages on October 18, 2026:

* **Tesla, Inc. — 0001318605.** [Official company submissions JSON](https://data.sec.gov/submissions/CIK0001318605.json); [SEC Tesla filing](https://www.sec.gov/Archives/edgar/data/1318605/000162828025026148/tsla-20250515.htm).
* **Space Exploration Technologies Corp. — 0001181412.** [Official company submissions JSON](https://data.sec.gov/submissions/CIK0001181412.json); [SEC filing detail explicitly naming the filer and CIK](https://www.sec.gov/Archives/edgar/data/1181412/000162828026042109/0001628280-26-042109-index.html).
* [SEC API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces): zero-padded submissions endpoint, recent history and additional historical files, real-time dissemination; typical submissions processing delay is below one second but can increase at peak times. That is SEC processing, not a promise about this monitor or email.
* [SEC Developer Resources](https://www.sec.gov/about/developer-resources): company/latest-filings RSS searches and the aggregate maximum of 10 requests/second regardless of machine count.
* [Accessing EDGAR Data](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data): declared User-Agent example, efficient access and dissemination hours.
* [SEC Privacy and Security Policy](https://www.sec.gov/about/privacy-information): blocking policy and reduced-rate recovery guidance. Check these sources periodically; policies and endpoints may change.

Offline validation:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

The included tests exercise baseline/deduplication, restart persistence, amendment matching, CIK/schema validation, Atom parsing, keyword normalization, request spacing, 429/Retry-After cooldown, SMTP failure/success and document retry/deduplication. Network behavior is mocked. Live SMTP delivery, network performance, and actual scheduled execution must be verified on your configured PC; no credentials are bundled.
