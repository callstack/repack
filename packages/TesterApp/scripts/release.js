const { execSync } = require('child_process');

function runCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    process.exit(1);
  }
}

function buildIOS() {
  runCommand('pnpm bundle:ios');
  process.chdir('./ios');
  runCommand('bundle exec pod install');
  runCommand('npx react-native run-ios --mode "Release"');
}

function buildAndroid() {
  console.log('Building Android...');
  runCommand('pnpm bundle:android');
  runCommand(
    'npx react-native run-android --tasks assembleRelease,installRelease'
  );
}

const platform = process.argv[2] || '';
if (platform === 'ios') {
  buildIOS();
} else if (platform === 'android') {
  buildAndroid();
} else {
  console.error('Please specify either "ios" or "android" as an argument.');
  process.exit(1);
}
