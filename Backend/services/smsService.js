const green = '\u001b[32m';
const reset = '\u001b[0m';

const sendSMS = async (phoneNumber, message) => {
  if (!phoneNumber) {
    throw new Error('Telefon numarası zorunludur.');
  }

  const safeMessage = message || 'Bildirim içeriği yok.';
  console.log(`${green}[truss SMS GATEWAY] -> Alıcı: ${phoneNumber} | Mesaj: ${safeMessage} | Durum: Başarılı${reset}`);

  return {
    success: true,
    phoneNumber,
    message: safeMessage
  };
};

module.exports = {
  sendSMS
};

