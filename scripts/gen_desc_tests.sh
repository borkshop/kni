#!/usr/bin/env bash
set -e

strip_ansi()
{
    # NOTE this is just SGR sequences... but like... what else do you need?
    # TODO go rip off the node ansi-regex module if you must
    sed -e 's/\x1b\[[0-9;]*m//g'
}

node kni.js -d hello.kni | strip_ansi >tests/hello.desc

for kniscript in examples/*.kni; do
    descript=tests/$(basename "$kniscript" .kni).desc
    node kni.js -d "$kniscript" | strip_ansi >"$descript"
done
