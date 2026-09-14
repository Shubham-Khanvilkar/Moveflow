module.exports = {
  apps: [{
    name: 'moveflow-api',
    script: './apps/api-gateway/dist/src/main.js',
    cwd: './',
    env: {
      PORT: '3001',
      NODE_ENV: 'development',
      CORS_ORIGIN: 'http://localhost:3000,http://localhost:3080',
    },
  }],
};
