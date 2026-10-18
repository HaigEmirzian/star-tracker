# Validation record

Validated October 18, 2026 on Windows using the bundled Python runtime.

* 14 offline unit tests passed.
* Command-line help smoke check passed.
* Task Scheduler installer passed PowerShell syntax parsing.
* Both company identities and current SEC documentation were checked against the official sources linked in README.md.

The tests use mocked SEC and SMTP calls. No live latency benchmark, email delivery test, scheduled task registration, or unattended reboot test was performed. These require your actual User-Agent contact, SMTP configuration and Windows task account. No credentials or invented benchmark measurements are included.

The standard `python`/`py` commands did not find a usable Python installation in the setup environment. Follow README step 1 on the PC that will host the monitor. The bundled runtime was used for development verification only.
