#!/bin/bash

echo "=== Starting Backend ==="
(
  cd backend || exit
  source venv/bin/activate
  python3 run.py
) &   # Run backend in background

echo "Backend is running in background."

echo "=== Starting Frontend ==="
(
  cd frontend || exit
  PORT=3000 npm run dev
) &   # Run frontend in background

echo "Frontend is running in background."

echo ""
echo "========================================="
echo " Backend  → http://localhost:8000        "
echo " Frontend → http://localhost:3000        "
echo "========================================="
echo "Use 'ps -A' to check running processes."
echo "Use 'kill <pid>' to stop them."
