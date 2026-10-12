module.exports = {
  apps: [
    {
      name: "arsip-ilmiah",
      script: "server.js",
      env: {
        PORT: 9871,
        ADMIN_PASSWORD: "atming",
        SECRET: "huhuhehesecret",
        HTTPS: "", // isi '1' kalau web diakses lewat https
      },
    },
  ],
};
