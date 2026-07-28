import crypto from 'crypto';

/**
 * Validates initialization data received from the MAX WebApp client.
 * According to MAX documentation:
 * 1. Extract WebAppData from the URL hash.
 * 2. Filter out 'hash', sort keys alphabetically.
 * 3. Create check string: key1=value1\nkey2=value2
 * 4. secret_key = HMAC-SHA256(key = "WebAppData", message = botToken)
 * 5. signature = HMAC-SHA256(key = secret_key, message = checkString)
 */
export function validateMAXData(appData: string, botToken: string): boolean {
  try {
    if (!appData) return false;
    
    const params = appData.split('&').map(x => {
      const idx = x.indexOf('=');
      if (idx === -1) return [x, ''];
      return [x.slice(0, idx), x.slice(idx + 1)];
    });

    const hashParam = params.find(x => x[0] === 'hash');
    if (!hashParam || !hashParam[1]) return false;
    const originalHash = hashParam[1];

    // Decode URI values and exclude hash
    const decodedParams = params
      .filter(x => x[0] !== 'hash')
      .map(([key, val]) => [key, decodeURIComponent(val)]);

    // Sort keys alphabetically (a -> z)
    decodedParams.sort((a, b) => a[0].localeCompare(b[0]));

    // Build the check string
    const checkString = decodedParams.map(([key, val]) => `${key}=${val}`).join('\n');

    // secret_key = HMAC-SHA256(key="WebAppData", message=botToken)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    // calculated = HMAC-SHA256(key=secretKey, message=checkString)
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    return calculatedHash === originalHash;
  } catch (error) {
    console.error('Error validating MAX data:', error);
    return false;
  }
}

/**
 * Validates initialization data received from the Telegram Mini App client.
 * According to Telegram documentation:
 * 1. Parse query string, extract 'hash'.
 * 2. Sort keys alphabetically.
 * 3. Create check string: key1=value1\nkey2=value2
 * 4. secret_key = HMAC-SHA256(key = botToken, message = "WebAppData")
 * 5. signature = HMAC-SHA256(key = secret_key, message = checkString)
 */
export function validateTelegramData(initData: string, botToken: string): boolean {
  try {
    if (!initData) return false;

    const params = new URLSearchParams(initData);
    const originalHash = params.get('hash');
    if (!originalHash) return false;

    // Collect all parameters except 'hash'
    const sortedParams: string[] = [];
    params.forEach((value, key) => {
      if (key !== 'hash') {
        sortedParams.push(`${key}=${value}`);
      }
    });

    // Sort alphabetically
    sortedParams.sort();

    // Build check string
    const checkString = sortedParams.join('\n');

    // secret_key = HMAC-SHA256(key=botToken, message="WebAppData")
    const secretKey = crypto.createHmac('sha256', botToken).update('WebAppData').digest();

    // calculated = HMAC-SHA256(key=secretKey, message=checkString)
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    return calculatedHash === originalHash;
  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return false;
  }
}
