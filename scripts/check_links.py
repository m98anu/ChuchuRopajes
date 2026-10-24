#!/usr/bin/env python3
"""Check every link in data/sites.json and record its status.

status:
  ok        the site answered (2xx/3xx, or a bot wall such as 401/403/429)
  roto      404/410, server error, DNS or connection failure, after one retry
Writes last_checked (today) on every site and prints a short report.
Uses only the standard library so it runs on a bare GitHub Actions runner.
"""
import datetime
import json
import pathlib
import ssl
import sys
import time
import urllib.error
import urllib.request

DATA = pathlib.Path(__file__).resolve().parent.parent / "data" / "sites.json"
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36 ChuchuRopajesLinkCheck/1.0")
REACHABLE_ERRORS = {401, 403, 405, 406, 429}  # site exists but blocks bots
CTX = ssl.create_default_context()


def probe(url):
    """Return (ok: bool, detail: str)."""
    last = ""
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, method=method, headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
            "Accept-Language": "es,en;q=0.8",
        })
        try:
            with urllib.request.urlopen(req, timeout=25, context=CTX) as r:
                return True, f"{method} {r.status}"
        except urllib.error.HTTPError as e:
            if e.code in REACHABLE_ERRORS and method == "GET":
                return True, f"{method} {e.code} (bloqueo anti-bots)"
            last = f"{method} {e.code}"
        except Exception as e:  # DNS, timeout, TLS…
            last = f"{method} {type(e).__name__}: {e}"
    return False, last


def check(url):
    ok, detail = probe(url)
    if not ok:
        time.sleep(5)
        ok, detail = probe(url)
    return ok, detail


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    today = datetime.date.today().isoformat()
    broken = []
    for site in data["sites"]:
        ok, detail = check(site["url"])
        site["status"] = "ok" if ok else "roto"
        site["last_checked"] = today
        print(f"{'OK  ' if ok else 'ROTO'} {site['name']:<22} {detail}  {site['url']}")
        if not ok:
            broken.append(site["name"])
    data["updated"] = today
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n{len(data['sites'])} enlaces revisados, {len(broken)} caídos"
          + (": " + ", ".join(broken) if broken else "."))
    return 0


if __name__ == "__main__":
    sys.exit(main())
