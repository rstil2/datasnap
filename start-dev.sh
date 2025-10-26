#!/bin/bash

# DataSnap Development Environment Startup Script
echo "🚀 Starting DataSnap Development Environment..."

# Function to handle cleanup on exit
cleanup() {
    echo "🛑 Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start the backend
echo "📡 Starting Backend API Server..."
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

# Start the frontend
echo "🎨 Starting Frontend Development Server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Development environment started!"
echo "📡 Backend API: http://localhost:8000"
echo "🎨 Frontend: http://localhost:5173"
echo "🖥️  Electron App: Run 'npm run electron:dev' in frontend folder"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for either process to exit
wait $BACKEND_PID $FRONTEND_PID