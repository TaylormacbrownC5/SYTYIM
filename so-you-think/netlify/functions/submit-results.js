exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  try {
    const { binId, candidateName, candidateEmail, candidatePhone, candidateContactType, questions, answers } = JSON.parse(event.body);

    // 1. Load host info from JSONBin
    const binResp = await fetch("https://api.jsonbin.io/v3/b/" + binId + "/latest", {
      headers: { "X-Master-Key": process.env.JSONBIN_API_KEY }
    });
    const binData = await binResp.json();
    const { hostName, hostEmail, hostPhone, hostNotifyType } = binData.record;

    // 2. Build Q&A summary
    const qaSummary = questions.map((q, i) => `Q: ${q.text}\nA: ${answers[i] || '(no answer)'}`).join('\n\n');

    // 3. Ask Claude for a compatibility score + summary
    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are a thoughtful matchmaking analyst. A candidate named ${candidateName} has answered a compatibility questionnaire created by ${hostName}. Based on their answers, provide a compatibility assessment.

Here are their answers:
${qaSummary}

Respond ONLY with a JSON object (no markdown, no backticks):
{
  "score": <number 1-100>,
  "rating": "<one of: Low Match, Moderate Match, Good Match, Strong Match, Exceptional Match>",
  "summary": "<2-3 sentence summary of their compatibility based on the answers>",
  "highlights": ["<positive trait 1>", "<positive trait 2>", "<positive trait 3>"],
  "considerations": ["<consideration 1>", "<consideration 2>"]
}`
        }]
      })
    });

    const aiData = await aiResp.json();
    const rawAI = aiData.content.map(b => b.text || '').join('');
    const start = rawAI.indexOf('{');
    const end = rawAI.lastIndexOf('}');
    const assessment = JSON.parse(rawAI.slice(start, end + 1));

    // 4. Save results to JSONBin
    const resultsBin = await fetch("https://api.jsonbin.io/v3/b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": process.env.JSONBIN_API_KEY,
        "X-Bin-Private": "false"
      },
      body: JSON.stringify({
        candidateName, candidateEmail, candidatePhone, candidateContactType,
        questions, answers, assessment, hostName, submittedAt: new Date().toISOString()
      })
    });
    const resultsData = await resultsBin.json();
    const resultsBinId = resultsData.metadata && resultsData.metadata.id;

    // 5. Build results URL
    const siteUrl = process.env.URL || "https://quiet-conkies-37c697.netlify.app";
    const resultsUrl = `${siteUrl}/results.html?r=${resultsBinId}`;

    // 6. Send notification to host
    const notifyMsg = `💌 New match alert!\n\n${candidateName} just completed your questionnaire.\n\nCompatibility: ${assessment.rating} (${assessment.score}/100)\n\nView full results: ${resultsUrl}`;

    if (hostNotifyType === 'email' && hostEmail) {
      await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_PUBLIC_KEY,
          template_params: {
            to_email: hostEmail,
            to_name: hostName,
            candidate_name: candidateName,
            rating: assessment.rating,
            score: assessment.score,
            summary: assessment.summary,
            results_url: resultsUrl
          }
        })
      });
    }

    if (hostNotifyType === 'sms' && hostPhone) {
      await fetch("https://api.twilio.com/2010-04-01/Accounts/" + process.env.TWILIO_ACCOUNT_SID + "/Messages.json", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(process.env.TWILIO_ACCOUNT_SID + ":" + process.env.TWILIO_AUTH_TOKEN).toString("base64")
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_PHONE_NUMBER,
          To: hostPhone,
          Body: notifyMsg
        }).toString()
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, resultsUrl, assessment }) };

  } catch (err) {
    console.error("submit-results error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
