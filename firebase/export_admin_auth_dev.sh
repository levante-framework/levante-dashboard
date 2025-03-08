#!/bin/bash

# Set your Firebase project ID
PROJECT_ID="hs-levante-admin-dev"

# Set the output file name and format
# DON'T save to the repo, as we don't want it to be accidentally pushed
OUTPUT_FILE="firebase_users_dev.json"
FORMAT="json"

# Export Firebase authentication data
firebase auth:export $OUTPUT_FILE --format=$FORMAT --project $PROJECT_ID

# Check if the export was successful
if [ $? -eq 0 ]; then
    echo "Authentication data exported successfully to $OUTPUT_FILE"
else
    echo "Error exporting authentication data"
fi
