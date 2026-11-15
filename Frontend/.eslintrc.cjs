module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    "no-alert": "error",
    "no-restricted-globals": [
      "error",
      {
        "name": "confirm",
        "message": "TRUSS MİMARİ İHLALİ: Tarayıcı uyarıları KESİNLİKLE yasaktır. Shadcn AlertDialog kullanın."
      },
      {
        "name": "alert",
        "message": "TRUSS MİMARİ İHLALİ: window.alert yasaktır. react-hot-toast kullanın."
      }
    ]
  }
};
