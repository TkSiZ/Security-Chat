#!/bin/bash
set -euo pipefail

# Read environment variables, with defaults
DB_NAME="${APP_DB:-app_db}"
DB_USER="${APP_USER:-app_user}"
DB_PASS="${APP_PASSWORD:-app_password}"

if [ ! -s "$PGDATA/PG_VERSION" ]; then
    echo "Database not initialized. Running custom init..."

    # initialize database
    gosu postgres initdb -D "$PGDATA"
    
    # allow connections from any host (add to pg_hba.conf)
    echo "host all all 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"
    
    # start temporary server
    gosu postgres pg_ctl -D "$PGDATA" -o "-c listen_addresses='*'" -w start

    # create database and user
    gosu postgres psql --username=postgres --dbname=postgres <<EOSQL
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOSQL

    # run migrations
    for f in /migrations/*.sql; do
        echo "Executing $f"
        gosu postgres psql --username=postgres --dbname=$DB_NAME -f "$f"
    done

    # stop temporary server
    gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop
else
    echo "Database already initialized."
fi

echo "Starting Postgres server..."
exec gosu postgres postgres -c listen_addresses='*'
