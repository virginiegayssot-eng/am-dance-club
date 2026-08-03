#!/bin/bash

# THE A.M Dance Club — Manual Backup Script
# Run this occasionally to export your data to CSV files
#
# Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set —
# same env vars the app itself uses (see .env.local, or copy them from
# Supabase dashboard > Settings > API). Never hardcode these values here:
# this file is committed to git, and a hardcoded key stays in git history
# even after being removed from a later commit.

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  echo "Run this with: source .env.local && ./backup.sh"
  echo "(or export both env vars yourself before running this script)"
  exit 1
fi

SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

DATE=$(date +%Y-%m-%d)
DIR="$HOME/Desktop/THE AM BACKUP/AM_Dance_Backups/$DATE"
mkdir -p "$DIR"

echo "Backing up data to $DIR..."

# Students
curl -s "$SUPABASE_URL/rest/v1/profiles?role=eq.student&select=full_name,email,phone,created_at" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Accept: text/csv" > "$DIR/students.csv"

# Classes
curl -s "$SUPABASE_URL/rest/v1/classes?select=title,class_date,class_time,location,capacity" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Accept: text/csv" > "$DIR/classes.csv"

# Registrations
curl -s "$SUPABASE_URL/rest/v1/registrations?select=student_id,class_id,status,payment_type,amount_paid_cents,created_at" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Accept: text/csv" > "$DIR/registrations.csv"

# Passes
curl -s "$SUPABASE_URL/rest/v1/passes?select=student_id,pass_type_id,classes_total,classes_remaining,expires_at,source,created_at" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Accept: text/csv" > "$DIR/passes.csv"

echo "Done! Files saved to $DIR"
open "$DIR"
