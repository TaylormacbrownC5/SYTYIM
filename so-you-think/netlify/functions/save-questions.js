exports.handler = async (event, context) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    const { sessionId, questions } = JSON.parse(event.body);
    const store = context.blobs.getStore('questions');
    await store.set(sessionId, JSON.stringify(questions));
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
