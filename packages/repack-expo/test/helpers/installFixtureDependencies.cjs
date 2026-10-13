const fs = require('node:fs');
const path = require('node:path');

const packageRoot = path.resolve(__dirname, '..', '..');

function installFixtureDependencies(projectRoot, packageNames) {
  const nodeModulesRoot = path.join(projectRoot, 'node_modules');
  fs.mkdirSync(nodeModulesRoot, { recursive: true });

  for (const packageName of packageNames) {
    const destination = path.join(nodeModulesRoot, packageName);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const dependencyRoot = fs.realpathSync(
      path.join(packageRoot, 'node_modules', packageName)
    );
    fs.symlinkSync(dependencyRoot, destination, 'junction');
  }
}

module.exports = {
  installFixtureDependencies,
};
