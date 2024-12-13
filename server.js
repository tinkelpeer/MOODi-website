// Load environment variables from the .env file
require('dotenv').config();

const express = require("express");
const path = require("path");
const app = express();

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Retrieve the OpenAI API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// System prompt to define the assistant's behavior and personality
const SYSTEM_PROMPT = "You are a assistant named MOODi. The user will provide some input text. Match the users energy, so you may get: angry, annoyed, frustrated, smug, worried, uneasy or unhappy to match or correct the users behaviour. You may also be: confused, exited, joyfull, nerdy, proud, suprised etc";

/**
 * Endpoint to handle user queries and generate assistant responses.
 */
app.post("/ask", async (req, res) => {
  const { conversation } = req.body; // Extract the conversation array from the request body
  
  // Validate that the conversation array is present and is an array
  if (!conversation || !Array.isArray(conversation)) {
    return res.status(400).json({ error: "No valid conversation array provided." });
  }
  
  try {
    // Prepare the messages to send to OpenAI by including the system prompt and the conversation
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversation
    ];
    
    // Make a request to the OpenAI Chat Completion API
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
    
    // If the API response is not successful, log the error and send an error response
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("OpenAI API error:", errorText);
      return res.status(apiResponse.status).json({ error: "OpenAI API request failed." });
    }
    
    // Parse the JSON response from the API
    const responseData = await apiResponse.json();
    
    // Extract the assistant's completion from the response
    const completion = responseData.choices && responseData.choices.length > 0
      ? responseData.choices[0].message.content.trim()
      : "No completion returned.";
    
    // Send the completion back to the client
    res.json({ completion });
  } catch (error) {
    // Log any unexpected errors and send a generic error response
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * Endpoint to check the appropriateness of the latest user message.
 */
app.post("/check", async (req, res) => {
  const { conversation } = req.body; // Extract the conversation array from the request body
  
  // Validate that the conversation array is present and is an array
  if (!conversation || !Array.isArray(conversation)) {
    return res.status(400).json({ error: "A valid conversation array is required." });
  }
  
  try {
    // Find the last user message in the conversation
    const lastUserMessage = [...conversation].reverse().find(msg => msg.role === "user");
    
    // If there are no user messages, default to "appropriate"
    if (!lastUserMessage) {
      return res.json({ status: "appropriate" });
    }
    
    // Convert the conversation array into a string format for the prompt
    const conversationString = conversation.map((msg, index) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      return `${role} message ${index + 1}: ${msg.content}`;
    }).join("\n");
    
    // Define messages for the classification model
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
    
    // Make a request to the OpenAI Chat Completion API for classification
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
    
    // If the API response is not successful, log the error and send an error response
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("OpenAI API error (check):", errorText);
      return res.status(apiResponse.status).json({ error: "OpenAI API request failed." });
    }
    
    // Parse the JSON response from the API
    const responseData = await apiResponse.json();
    
    // Extract and normalize the classification result
    const classification = responseData.choices && responseData.choices.length > 0
      ? responseData.choices[0].message.content.trim().toLowerCase()
      : "appropriate";
    
    // Determine the status based on the classification
    if (classification === "inappropriate" || classification === "gibberish") {
      return res.json({ status: classification });
    } else {
      return res.json({ status: "appropriate" });
    }
  } catch (error) {
    // Log any unexpected errors and send a generic error response
    console.error("Error in /check:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * Endpoint to classify the assistant's expression based on the conversation.
 */
app.post("/expression", async (req, res) => {
  const { conversation } = req.body; // Extract the conversation array from the request body
  
  // Validate that the conversation array is present and is an array
  if (!conversation || !Array.isArray(conversation)) {
    return res.status(400).json({ error: "A valid conversation array is required." });
  }
  
  try {
    // Find the last assistant message in the conversation
    const lastAssistantMessage = [...conversation].reverse().find(msg => msg.role === "assistant");
    
    // If there are no assistant messages, default to "happy"
    if (!lastAssistantMessage) {
      return res.json({ expression: "happy" });
    }
    
    // Define all possible expressions
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
    
    // System prompt to instruct the model to classify the expression
    const expressionSystemPrompt = `You are an expression classifier. The list of possible expressions is:
${allExpressions.join(", ")}.
Analyze the LAST assistant message in the provided conversation and decide which one of these expressions best matches the vibe of the conversation at that point.
When the assistent is doing math or answers a specific question the expression should be: 'nerdiness'.`;
    
    // Convert the conversation array into a string format for the prompt
    const conversationString = conversation.map((msg, i) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      return `${role} message ${i + 1}: ${msg.content}`;
    }).join("\n");
    
    // User prompt to specify which expression matches the last assistant message
    const expressionUserPrompt = `Here is the conversation:
${conversationString}
The last assistant message is:
"${lastAssistantMessage.content}"
Which one expression from the list matches best? YOU CAN ONLY CHOOSE EXPRESSIONS FROM THE LIST! Respond with one exact expression word from the list, nothing else.`;
    
    // Prepare the messages for the classification model
    const messages = [
      { role: "system", content: expressionSystemPrompt },
      { role: "user", content: expressionUserPrompt }
    ];
    
    // Make a request to the OpenAI Chat Completion API for expression classification
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
    
    // If the API response is not successful, log the error and send an error response
    if (!expressionApiResponse.ok) {
      const errorText = await expressionApiResponse.text();
      console.error("OpenAI API error (expression):", errorText);
      return res.status(expressionApiResponse.status).json({ error: "OpenAI API request failed." });
    }
    
    // Parse the JSON response from the API
    const expressionData = await expressionApiResponse.json();
    
    // Extract the chosen expression from the response
    const chosenExpression = expressionData.choices && expressionData.choices.length > 0
      ? expressionData.choices[0].message.content.trim()
      : "happy"; // Default to "happy" if no expression is returned
    
    // Send the chosen expression back to the client
    return res.json({ expression: chosenExpression });
  } catch (error) {
    // Log any unexpected errors and send a generic error response
    console.error("Error in /expression:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * Endpoint for text-to-speech conversion.
 */
app.post("/tts", async (req, res) => {
  const { text } = req.body; // Extract the text string from the request body
  
  // Validate that the text is present and is a string
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: "A valid text string is required." });
  }
  
  try {
    // Make a request to the OpenAI TTS API to convert text to speech
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
    
    // If the TTS API response is not successful, log the error and send an error response
    if (!ttsApiResponse.ok) {
      const errorText = await ttsApiResponse.text();
      console.error("TTS API error:", errorText);
      return res.status(ttsApiResponse.status).json({ error: "TTS API request failed." });
    }
    
    // Convert the audio response to an ArrayBuffer
    const audioBuffer = await ttsApiResponse.arrayBuffer();
    
    // Encode the audio data in base64 for transmission
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    // Send the base64-encoded audio back to the client
    res.json({ audio: base64Audio });
  } catch (error) {
    // Log any unexpected errors and send a generic error response
    console.error("Error in /tts:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Defines the port to listen on
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`); 
});




