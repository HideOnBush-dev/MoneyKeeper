#!/bin/bash

# Script to start both backend and frontend development servers
# Usage: ./start-dev.sh

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Money Keeper Development Servers...${NC}\n"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Start Backend
echo -e "${GREEN}📦 Starting Backend Server...${NC}"
cd backend || exit 1
source venv/bin/activate
python3 run.py &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 2

# Start Frontend
echo -e "${GREEN}🎨 Starting Frontend Server...${NC}"
cd frontend || exit 1
PORT=3000 npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n${BLUE}✅ Both servers are starting!${NC}"
echo -e "${YELLOW}Backend: http://localhost:8000${NC}"
echo -e "${YELLOW}Frontend: http://localhost:3000${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop both servers${NC}\n"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

