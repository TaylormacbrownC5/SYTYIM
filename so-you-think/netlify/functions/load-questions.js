exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  try {
    const binId = event.queryStringParameters && event.queryStringParameters.s;
    if (!binId) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing session" }) };

    const resp = await fetch("https://api.jsonbin.io/v3/b/" + binId + "/latest", {
      headers: { "X-Master-Key": process.env.JSONBIN_API_KEY }
    });

    const data = await resp.json();
    const questions = data.record && data.record.questions;
    if (!questions) return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };

    return { statusCode: 200, headers, body: JSON.stringify({ questions }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
