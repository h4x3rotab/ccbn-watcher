#!/bin/bash

base="$(dirname "$(readlink -f "$0")")"
run="${base}/run"

rm -rf "$run"
mkdir "$run"


echo "[TEST] Starting bgoldd regtest"
bgoldd -conf="${base}/regtest.conf" -datadir="${run}" >/dev/null &
echo "$!" > "${run}/bgoldd.pid"

# start listener
sleep 2
echo "[TEST] Starting ccbn watcher"
node --experimental-modules "${base}/../index.js" &
sleep 2

echo "[TEST] Starting reorg test"
bash "$base/reorgTest.sh"
sleep 5

echo "[TEST] clean up"
pkill -P $$
