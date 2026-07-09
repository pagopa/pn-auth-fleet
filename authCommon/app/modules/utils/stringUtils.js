/**
 * Masks a string by showing only the first 2 and last 2 characters.
 * Strings shorter than 6 characters are completely masked.
 *
 * @param {string} stringToMask - The string to mask
 * @returns {string} The masked string
 */
function maskString(stringToMask) {
  if (stringToMask.length < 6) {
    return "".padStart(stringToMask.length, "*");
  }

  const firstTwoChars = stringToMask.substring(0, 2);
  const lastTwoChars = stringToMask.substring(stringToMask.length - 2);
  const hiddenStringLength = stringToMask.length - 4;
  const hiddenString = "".padStart(hiddenStringLength, "*");

  return firstTwoChars + hiddenString + lastTwoChars;
}

module.exports = { maskString };
