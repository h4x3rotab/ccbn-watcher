#!/bin/bash

base="$(dirname "$(readlink -f "$0")")"
run="${base}/run"

rm -rf "$run"
mkdir "$run"


bgoldd -conf="${base}/regtest.conf" >/dev/null &
echo "$!" > "${run}/bgoldd.pid"

# start listener
sleep 2
node --experimental-modules "${base}/../index.js" &
sleep 2

# mine a few blocks
#bgold-cli 

bash "$base/reorgTest.sh"
sleep 2

pkill -P $$
