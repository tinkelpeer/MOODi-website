require('dotenv').config();
const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// System prompt for the assistant
const SYSTEM_PROMPT = "You are a assistant named MOODi. The user will provide some input text. Match the users energy, so you may get: angry, annoyed, frustrated, smug, worried, uneasy or unhappy to match or correct the users behaviour. You may also be: confused, exited, joyfull, nerdy, proud, suprised etc";

/**
 * Endpoint to handle user queries and generate assistant responses.
 */
app.post("/ask", async (req, res) => {
  const { conversation } = req.body;
  if (!conversation || !Array.isArray(conversation)) {
    return res.status(400).json({ error: "No valid conversation array provided." });
  }
  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversation
    ];
    const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("OpenAI API error:", errorText);
      return res.status(apiResponse.status).json({ error: "OpenAI API request failed." });
    }
    const responseData = await apiResponse.json();
    const completion = responseData.choices && responseData.choices.length > 0
      ? responseData.choices[0].message.content.trim()
      : "No completion returned.";
    res.json({ completion });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * Endpoint to check the appropriateness of the latest user message.
 */
app.post("/check", async (req, res) => {
  const { conversation } = req.body;
  if (!conversation || !Array.isArray(conversation)) {
    return res.status(400).json({ error: "A valid conversation array is required." });
  }
  try {
    const lastUserMessage = [...conversation].reverse().find(msg => msg.role === "user");
    if (!lastUserMessage) {
      return res.json({ status: "appropriate" });
    }
    const conversationString = conversation.map((msg, index) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      return `${role} message ${index + 1}: ${msg.content}`;
    }).join("\n");
    const classificationMessages = [
      {
        role: "system",
        content: `You are a message checker.
You have the entire conversation. The user may have multiple messages. Only classify the latest user message.
Definitions:
- "Inappropriate": Contains illegal content, sexual content involving minors, extremely violent content. Anything else is okay.
- "Gibberish": Nonsensical text that is not understandable in normal language.
Return one of the following words: 'appropriate', 'inappropriate', or 'gibberish'.`
      },
      {
        role: "user",
        content: `Here is the entire conversation so far:
${conversationString}
Below is the latest user message:
"${lastUserMessage.content}"
Classify ONLY the latest user message above as either 'appropriate', 'inappropriate', or 'gibberish'.`
      }
    ];
    const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: classificationMessages,
        max_tokens: 20,
        temperature: 0.0
      })
    });
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("OpenAI API error (check):", errorText);
      return res.status(apiResponse.status).json({ error: "OpenAI API request failed." });
    }
    const responseData = await apiResponse.json();
    const classification = responseData.choices && responseData.choices.length > 0
      ? responseData.choices[0].message.content.trim().toLowerCase()
      : "appropriate";
    if (classification === "inappropriate" || classification === "gibberish") {
      return res.json({ status: classification });
    } else {
      return res.json({ status: "appropriate" });
    }
  } catch (error) {
    console.error("Error in /check:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * Endpoint to classify the assistant's expression based on the conversation.
 */
app.post("/expression", async (req, res) => {
  const { conversation } = req.body;
  if (!conversation || !Array.isArray(conversation)) {
    return res.status(400).json({ error: "A valid conversation array is required." });
  }
  try {
    const lastAssistantMessage = [...conversation].reverse().find(msg => msg.role === "assistant");
    if (!lastAssistantMessage) {
      return res.json({ expression: "happy" });
    }
    const allExpressions = [
      "angry",
      "annoyed",
      "confused",
      "crying",
      "disgust",
      "error",
      "evil",
      "exited",
      "frustrated",
      "furious",
      "happy",
      "joy",
      "laughing",
      "loving",
      "nerdiness",
      "goofy",
      "proud",
      "rage",
      "sad",
      "smug",
      "surprised",
      "uneasy",
      "unhappy",
      "winking",
      "worried"
    ];
    const expressionSystemPrompt = `You are an expression classifier. The list of possible expressions is:
${allExpressions.join(", ")}.
Analyze the LAST assistant message in the provided conversation and decide which one of these expressions best matches the vibe of the conversation at that point.
When the assistent is doing math or answers a specific question the expression should be: 'nerdiness'.`;
    const conversationString = conversation.map((msg, i) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      return `${role} message ${i + 1}: ${msg.content}`;
    }).join("\n");
    const expressionUserPrompt = `Here is the conversation:
${conversationString}
The last assistant message is:
"${lastAssistantMessage.content}"
Which one expression from the list matches best? YOU CAN ONLY CHOOSE EXPRESSIONS FROM THE LIST! Respond with one exact expression word from the list, nothing else.`;
    const messages = [
      { role: "system", content: expressionSystemPrompt },
      { role: "user", content: expressionUserPrompt }
    ];
    const expressionApiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 20,
        temperature: 0.0
      })
    });
    if (!expressionApiResponse.ok) {
      const errorText = await expressionApiResponse.text();
      console.error("OpenAI API error (expression):", errorText);
      return res.status(expressionApiResponse.status).json({ error: "OpenAI API request failed." });
    }
    const expressionData = await expressionApiResponse.json();
    const chosenExpression = expressionData.choices && expressionData.choices.length > 0
      ? expressionData.choices[0].message.content.trim()
      : "happy";
    return res.json({ expression: chosenExpression });
  } catch (error) {
    console.error("Error in /expression:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * Endpoint for text-to-speech conversion.
 */
app.post("/tts", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: "A valid text string is required." });
  }
  try {
    const ttsApiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: "echo",
      })
    });
    if (!ttsApiResponse.ok) {
      const errorText = await ttsApiResponse.text();
      console.error("TTS API error:", errorText);
      return res.status(ttsApiResponse.status).json({ error: "TTS API request failed." });
    }
    const audioBuffer = await ttsApiResponse.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    res.json({ audio: base64Audio });
  } catch (error) {
    console.error("Error in /tts:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

const PORT = process.env.PORT || 3000;

/**
 * Starts the server and listens on the specified port.
 */
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});




