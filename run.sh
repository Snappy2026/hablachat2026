#!/bin/bash

echo "🚀 Launching Claude (Haiku 4.5) Messaging Engine & PWA Admin App..."

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Virtualenv setup check
VENV_DIR="$ROOT_DIR/api/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

echo "🐍 Activating Python virtual environment..."
source "$VENV_DIR/bin/activate"

# Ensure api path is in PYTHONPATH
export PYTHONPATH="$ROOT_DIR/api"

# Start FastAPI Backend on Port 8085
echo "🟢 Starting FastAPI Backend on http://localhost:8085..."
cd "$ROOT_DIR/api"
"$VENV_DIR/bin/python3" -m uvicorn app.main:app --host 0.0.0.0 --port 8085 --reload &
BACKEND_PID=$!

# Start Vite Frontend on Port 3005
echo "⚡ Starting Vite PWA Frontend on http://localhost:3005..."
cd "$ROOT_DIR/frontend"
npm run dev -- --host 0.0.0.0 --port 3005 &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

echo "✅ System initialized!"
echo "👉 Admin PWA UI: http://localhost:3005"
echo "👉 FastAPI Docs: http://localhost:8085/docs"

wait
