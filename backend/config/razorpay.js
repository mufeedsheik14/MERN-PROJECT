const Razorpay = require('razorpay');

let razorpayInstance = null;

/**
 * Returns a configured Razorpay client instance using TEST mode environment variables.
 * Key Secret is kept strictly server-side.
 */
function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayInstance;
}

module.exports = {
  getRazorpayClient,
};
