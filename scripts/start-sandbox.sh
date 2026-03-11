#!/bin/bash

# Start Amplify Sandbox in background
echo "🚀 Starting Amplify Sandbox..."
source .env.creds
export AWS_REGION=ap-southeast-2

# Start sandbox in background and save PID
npx ampx sandbox > amplify-sandbox.log 2>&1 &
SANDBOX_PID=$!
echo "Sandbox PID: $SANDBOX_PID"
echo $SANDBOX_PID > .sandbox.pid

echo "⏳ Waiting for sandbox to be ready..."
sleep 10

echo "✅ Sandbox started! Check amplify-sandbox.log for details"
echo ""
echo "To stop sandbox: kill \$(cat .sandbox.pid)"
