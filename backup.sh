#!/bin/bash

# THE A.M Dance Club — Manual Backup Script
# Run this occasionally to export your data to CSV files

DATE=$(date +%Y-%m-%d)
DIR="$HOME/Desktop/AM_Dance_Backups/$DATE"
mkdir -p "$DIR"

SUPABASE_URL="https://trsseitecjigqlqqscue.supabase.co"
SERVICE_KEY="sb_secret_f-oLKtttX8GvRkAbBCMZIQ_7_16WHMo"

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
