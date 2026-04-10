require('dotenv').config();
const app = require('./server');
const { startNotificationCron } = require('./services/notificationScheduler');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde calisiyor.`);
});

startNotificationCron();

