const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function createProject(options = {}) {
  const projectRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), options.prefix ?? 'repack-expo-cli-')
  );
  fs.writeFileSync(
    path.join(projectRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: options.name ?? 'fixture',
        main: 'expo-router/entry',
        scripts: {},
        dependencies: {
          ...(options.includeCommunityCli === false
            ? {}
            : { '@react-native-community/cli': '^20.0.0' }),
          expo: '~56.0.0',
          'expo-router': '~56.0.0',
          ...(options.dependencies ?? {}),
        },
      },
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    path.join(projectRoot, 'app.json'),
    `${JSON.stringify(
      {
        expo: {
          name: options.expoName ?? 'Fixture',
          slug: options.slug ?? 'fixture',
          ...(options.expo ?? {}),
        },
      },
      null,
      2
    )}\n`
  );
  if (options.lockfile) {
    fs.writeFileSync(path.join(projectRoot, options.lockfile), '');
  }
  fs.mkdirSync(path.join(projectRoot, 'node_modules', 'expo-router'), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(projectRoot, 'node_modules', 'expo-router', 'entry.js'),
    'module.exports = {};\n'
  );
  return projectRoot;
}

module.exports = { createProject };
