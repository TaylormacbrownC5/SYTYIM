const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  try {
    const { sessionId, questions, hostName, hostEmail, hostPhone, hostNotifyType } = JSON.parse(event.body);
    const resp = await fetch("https://api.jsonbin.io/v3/b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": process.env.JSONBIN_API_KEY,
        "X-Bin-Name": sessionId,
        "X-Bin-Private": "false"
      },
      body: JSON.stringify({ questions, hostName, hostEmail, hostPhone, hostNotifyType })
    });
    const data = await resp.json();
    const binId = data.metadata && data.metadata.id;
    if (!binId) throw new Error("No bin ID: " + JSON.stringify(data));
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, binId }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
