#!/bin/sh

rm -rf docs/api/dev-server
rm -rf docs/api/repack

mkdir -p ./docs/api/dev-server
cp -R ../packages/dev-server/docs/. ./docs/api/dev-server/.
mv ./docs/api/dev-server/README.md ./docs/api/dev-server/index.md

mkdir -p ./docs/api/repack
cp -R ../packages/repack/docs/. ./docs/api/repack/.
mv ./docs/api/repack/README.md ./docs/api/repack/index.md
mv ./docs/api/repack/client/README.md ./docs/api/repack/client/index.md

exit 0;
