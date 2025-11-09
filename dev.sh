#!/bin/bash

# Development script to run both backend and frontend

echo "Starting Money Keeper Development Servers..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start backend
echo "Starting Flask backend on http://localhost:8000..."
python run.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait a bit for backend to start
sleep 3

# Start frontend
echo ""
echo "Starting Vite frontend on http://localhost:3000..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "=========================================="
echo "Development servers are running!"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8000"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait
