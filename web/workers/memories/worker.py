#!/usr/bin/env python3
from __future__ import annotations
import os
import json
import time
from pathlib import Path
from typing import Dict, Any
from rich import print
from pipeline import run_pipeline

ROOT = Path(__file__).resolve().parents[2]
QUEUE = ROOT / 'queue'
PENDING = QUEUE / 'pending'
PROCESSING = QUEUE / 'processing'
RESULTS = QUEUE / 'results'
FAILED = QUEUE / 'failed'
UPLOADS = ROOT / 'uploads'

for d in (PENDING, PROCESSING, RESULTS, FAILED):
    d.mkdir(parents=True, exist_ok=True)


def move(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    src.replace(dst)


def step_once() -> bool:
    jobs = sorted(PENDING.glob('*.json'))
    if not jobs:
        return False
    job_file = jobs[0]
    with job_file.open('r', encoding='utf-8') as f:
        job = json.load(f)
    move(job_file, PROCESSING / job_file.name)
    print(f"[cyan]Processing[/] {job['id']} for upload {job['uploadId']}")
    try:
        # Assume file was saved as uploads/<uploadId>.*
        # Find first matching file
        cand = list(UPLOADS.glob(f"{job['uploadId']}.*"))
        if not cand:
            raise FileNotFoundError("Upload file not found")
        file_path = str(cand[0])
        result = run_pipeline(file_path)
        out = {
            "job": job,
            "result": result,
        }
        with (RESULTS / job_file.name).open('w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        (PROCESSING / job_file.name).unlink(missing_ok=True)
        print(f"[green]Completed[/] {job['id']}")
    except Exception as e:  # noqa: BLE001
        err = {
            "job": job,
            "error": str(e),
        }
        with (FAILED / job_file.name).open('w', encoding='utf-8') as f:
            json.dump(err, f, ensure_ascii=False, indent=2)
        (PROCESSING / job_file.name).unlink(missing_ok=True)
        print(f"[red]Failed[/] {job['id']}: {e}")
    return True


def main():
    print(f"[bold]Memories Worker[/] watching {PENDING}")
    while True:
        worked = step_once()
        time.sleep(0.5 if worked else 1.0)


if __name__ == '__main__':
    main()

