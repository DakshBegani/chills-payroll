module.exports = {
  apps: [{
    name: "chills-payroll-backend",
    script: "./index.js",
    watch: false,
    env: {
      NODE_ENV: "production",
      PORT: 5001,
      // You should set a secure random string for SECRET_KEY in your .env file
    },
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    time: true
  }]
}
