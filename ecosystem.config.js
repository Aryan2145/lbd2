module.exports = {
  apps: [
    {
      name: 'frontend',
      cwd: '/app/frontend',
      script: 'server.js',
      env: {
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        NODE_ENV: 'production',
      },
    },
    {
      name: 'backend',
      cwd: '/app/backend',
      script: 'dist/main.js',
      env: {
        PORT: 4000,
      },
    },
  ],
};
