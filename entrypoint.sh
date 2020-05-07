#!/bin/bash

# Start up web server and give it a chance to come up
npm start &
sleep 10s

# Get json file from server
cd /working
wget --output-document=data.json localhost:8081/massaged/json
