#!/bin/bash

base="$(dirname "$(readlink -f "$0")")"
run="${base}/run"

bgold-cli -conf="${base}/regtest.conf" "$@"