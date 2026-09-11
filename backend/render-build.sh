{
  "name": "yusr-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "build": "cd ../frontend && npm install && npm run build",
    "test": "node --test tests/*.test.mjs",
    "dev": "node --env-file=.env server.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
