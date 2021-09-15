#!/bin/sh

yarn del docs/api
mkdir -p tmp

yarn --cwd ../packages/repack typedoc --options typedoc.node.json
yarn --cwd ../packages/repack typedoc --options typedoc.react-native.json

mv ./docs/api/node/README.md ./docs/api/node/index.md
mv ./docs/api/react-native/README.md ./docs/api/react-native/index.md



git diff origin/nativepack:templates/webpack.config.js origin/main:templates/webpack.config.js > tmp/repack_1-2.diff

exit 0;
