base="$(dirname "$(readlink -f "$0")")"
run="${base}/run"

function cli {
  echo "[CLI]: $@"
  "${base}/cli.sh" "$@"
  sleep 0.5
}
function tiphash {
  "${base}/cli.sh" getbestblockhash
}

cli generate 2
orig=$(tiphash)
# A B*

cli generate 1
bad1=$(tiphash)
# A B C1*

cli generate 2
badtip=$(tiphash)
# A B C1 D1 E1*

cli invalidateblock "${bad1}"
# A B

cli generate 1
good1=$(tiphash)
# A B C2*

cli generate 1
goodtip=$(tiphash)
# A B C2 D2*

cli reconsiderblock "${bad1}"
tip=$(tiphash)
# A B C1 D1 E1*

echo "E1: ${badtip} vs ${tip}"
