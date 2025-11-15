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
  npm run dev
) &   # Run frontend in background

echo "Frontend is running in background."

echo ""
echo "========================================="
echo " Backend  → http://localhost:<BE_PORT>   "
echo " Frontend → http://localhost:<FE_PORT>   "
echo "========================================="
echo "Use 'ps -A' to check running processes."
echo "Use 'kill <pid>' to stop them."
