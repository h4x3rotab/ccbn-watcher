#!/bin/bash

base="$(dirname "$(readlink -f "$0")")"
run="${base}/run"

rm -rf "$run"
mkdir "$run"


bgoldd -conf="${base}/regtest.conf" &
echo "$#" > "${run}/bgoldd.pid"

# start listener
sleep 1
node "${base}/../index.js"

# mine a few blocks
#bgold-cli 

kill $(cat "${run}/goldd.pid")
