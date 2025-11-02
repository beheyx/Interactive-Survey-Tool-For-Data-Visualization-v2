#!/bin/sh

# wait-for.sh host:port -- command args...
HOST_PORT=$1
shift

# Wait for service
HOST=$(echo "$HOST_PORT" | cut -d: -f1)
PORT=$(echo "$HOST_PORT" | cut -d: -f2)

echo "Waiting for $HOST:$PORT..."

until nc -z "$HOST" "$PORT"; do
  sleep 2
done

echo "$HOST:$PORT is available. Starting application..."

# Run the rest of the command
exec "$@"