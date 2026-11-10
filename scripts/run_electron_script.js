const { spawn } = require('child_process');
const electronPath = require('electron');
const path = require('path');

const targetScript = path.resolve(process.argv[2] || 'scripts/render_marketing');
console.log('Spawning Electron with target:', targetScript);

const childEnv = { ...process.env };
delete childEnv.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [targetScript], {
  stdio: 'inherit',
  env: childEnv
});

child.on('exit', (code) => {
  console.log('Electron process exited with code:', code);
  process.exit(code);
});
