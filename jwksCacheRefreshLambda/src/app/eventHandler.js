async function handleEvent(event) {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'OK' }),
  }
}

module.exports = { handleEvent };
