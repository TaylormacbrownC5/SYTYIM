exports.handler = async (event, context) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const sessionId = event.queryStringParameters && event.queryStringParameters.session;
    if (!sessionId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing session' }) };

    const { blobs } = context;
    const data = await blobs.get(sessionId);
    if (!data) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Session not found' }) };

    return { statusCode: 200, headers, body: JSON.stringify({ questions: JSON.parse(data) }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
