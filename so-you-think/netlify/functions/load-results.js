exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  try {
    const binId = event.queryStringParameters && event.queryStringParameters.r;
    if (!binId) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing ID" }) };
    const resp = await fetch("https://api.jsonbin.io/v3/b/" + binId + "/latest", {
      headers: { "X-Master-Key": process.env.JSONBIN_API_KEY }
    });
    const data = await resp.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
