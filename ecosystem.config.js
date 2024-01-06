module.exports = {
    apps: [
      {
        name: "Yelan",
        script: "npm",
        args: "start",
        env: {
          NODE_ENV: "production",
        },
        log_date_format: "YYYY-MM-DD HH:mm Z",
        min_uptime: "5m", // 5 minute
        max_restarts: 20,
      },
    ],
  };
  