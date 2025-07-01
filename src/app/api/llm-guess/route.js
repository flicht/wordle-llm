export async function POST(request) {
  const { history, feedback } = await request.json();
  const apiKey = process.env.OPENAI_API_KEY;

  const prompt = `
You are an expert Wordle player. Your task is to guess the solution using the fewest guesses.

The game state will be given as:
- history: an array of previous 5-letter guesses (e.g., ["SLATE", "CRONY"])
- feedback: an array of arrays indicating feedback for each letter using 'g' (green, correct letter and position), 'y' (yellow, correct letter, wrong position), 'b' (gray, not in word), e.g., [["b","b","y","b","b"],["g","b","y","b","b"]]

Never repeat a previous guess. Use only valid 5-letter English words from the official Wordle dictionary. Always pick the best possible guess based on all feedback.

Here is the game state:
history: ${JSON.stringify(history)}
feedback: ${JSON.stringify(feedback)}

Respond **only** in this JSON format (no explanation outside the object): 
{"guess": "[GUESS]", "reason": "[your reason, 20 words or fewer]"}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.2,
    })
  });
  const data = await response.json();
  try {
    const match = data.choices[0].message.content.match(/\{.*\}/s);
    const json = JSON.parse(match[0]);
    return Response.json(json);
  } catch (e) {
    return Response.json({ error: "Bad response", raw: data }, { status: 500 });
  }
}