Memories AI Ingestor — Python Worker (skeleton)

Overview

- Watches a file-based queue produced by the Next.js API under `queue/pending/*.json`.
- For each job, reads the referenced upload file from `uploads/`, performs OCR+NER (mock here),
  and writes a result JSON into `queue/results/<jobId>.json` with the contract defined in `src/domain/memories.ts`.

Quick start (dev)

1. Create a venv and install requirements
   - python3 -m venv .venv && source .venv/bin/activate
   - pip install -r requirements.txt
2. Run the worker
   - python worker.py
3. Use the app to upload a file and create a job
   - POST /api/memories/upload (multipart/form-data: file)
   - POST /api/memories/jobs { uploadId }
4. Poll job status
   - GET /api/memories/jobs/:id

Notes

- This is a filesystem-backed mock queue for local development. In production, replace with a real queue (BullMQ, SQS…).
- Implement actual OCR/HTR (TrOCR/Transkribus/Kraken) and NER (spaCy/transformer) in `pipeline.py`.

