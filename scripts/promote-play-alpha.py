#!/usr/bin/env python3
"""Inspect Play tracks, then optionally promote an already accepted internal bundle to alpha.

No bundle upload and no production writes. Invoked only by a manually dispatched,
SHA-pinned GitHub Actions job with the existing Play service-account secret.
"""
import json
import os

from google.oauth2 import service_account
from googleapiclient.discovery import build

PACKAGE = "fr.acousmatictheatre.mises"
SCOPE = "https://www.googleapis.com/auth/androidpublisher"


def releases(track):
    return [
        {"name": r.get("name", ""), "codes": [int(c) for c in r.get("versionCodes", [])], "status": r.get("status", "")}
        for r in track.get("releases", [])
    ]


def inspect(service, edit_id):
    tracks = service.edits().tracks().list(packageName=PACKAGE, editId=edit_id).execute().get("tracks", [])
    result = {t["track"]: releases(t) for t in tracks}
    print("Play tracks (readback):", json.dumps(result, sort_keys=True))
    return result


def check(current, code):
    internal = current.get("internal", [])
    if not any(code in r["codes"] and r["status"] == "completed" for r in internal):
        raise RuntimeError(f"versionCode {code} is not a completed internal release; refusing promotion")
    alpha = current.get("alpha", [])
    if any(c > code for r in alpha for c in r["codes"]):
        raise RuntimeError("Alpha contains a newer code; refusing downgrade")
    if any(c > code for r in current.get("production", []) for c in r["codes"]):
        raise RuntimeError("Production has a newer code; source must be reviewed before promotion")
    if any(code in r["codes"] and r["status"] == "completed" for r in alpha):
        return False
    return True


def main():
    version = os.environ["EXPECTED_VERSION"]
    code = int(os.environ["EXPECTED_VERSION_CODE"])
    mode = os.environ["ALPHA_MODE"]
    if mode not in ("inspect", "promote"):
        raise RuntimeError("Invalid ALPHA_MODE")
    credentials = service_account.Credentials.from_service_account_info(
        json.loads(os.environ["PLAY_SERVICE_ACCOUNT_JSON"]), scopes=[SCOPE]
    )
    service = build("androidpublisher", "v3", credentials=credentials, cache_discovery=False)
    edit_id = service.edits().insert(packageName=PACKAGE, body={}).execute()["id"]
    current = inspect(service, edit_id)
    necessary = check(current, code)
    if mode == "inspect":
        print(f"Inspection only: alpha promotion necessary={necessary}; no Play commit")
        return
    if not necessary:
        print(f"Already completed in alpha: versionCode={code}; no Play commit")
        return
    # Replace ONLY the alpha track. Reuse a bundle already accepted in internal.
    body = {"track": "alpha", "releases": [{"name": f"MISES ! {version}", "versionCodes": [str(code)], "status": "completed"}]}
    service.edits().tracks().update(packageName=PACKAGE, editId=edit_id, track="alpha", body=body).execute()
    service.edits().commit(
        packageName=PACKAGE, editId=edit_id,
        changesInReviewBehavior="ERROR_IF_IN_REVIEW",
    ).execute()
    # A fresh edit is required to read the committed server state, not the stale edit.
    verify_id = service.edits().insert(packageName=PACKAGE, body={}).execute()["id"]
    after = inspect(service, verify_id)
    if not any(code in r["codes"] and r["status"] == "completed" for r in after.get("alpha", [])):
        raise RuntimeError("Play commit returned but alpha readback did not show completed version")
    print(f"Verified Play alpha release: {PACKAGE} {version} versionCode={code}")


if __name__ == "__main__":
    main()
