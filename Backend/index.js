const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const app = require('./server');
const { startNotificationCron } = require('./services/notificationScheduler');

const PORT = process.env.PORT || 5001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde calisiyor.`);
  });

  startNotificationCron();
}

module.exports = app;
