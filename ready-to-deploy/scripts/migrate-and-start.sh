#!/bin/bash
set -e

echo "🚀 Starting migration and server process..."

# Wait for DB to be ready
echo "⏳ Waiting for database to be ready..."
until npx drizzle-kit migrate; do
  echo "Database not ready yet, waiting..."
  sleep 2
done

echo "✅ Migrations applied successfully."

# Start the application
echo "🔌 Starting server..."
exec npm run start
