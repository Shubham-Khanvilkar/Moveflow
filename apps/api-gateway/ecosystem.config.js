module.exports = {
  apps: [{
    name: 'moveflow-api',
    script: 'dist/src/main.js',
    cwd: __dirname,
    env: {
      PORT: 3001,
      NODE_ENV: 'development',
    },
  }],
};
