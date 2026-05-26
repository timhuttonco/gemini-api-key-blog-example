import { onCall, HttpsError } from "firebase-functions/v2/https";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { GoogleGenAI } from "@google/genai";

const secretClient = new SecretManagerServiceClient();

export const askGemini = onCall({
  // Enforce App Check to prevent unauthorised domain or bot usage
  enforceAppCheck: true
}, async (request) => {
  
  // The user prompt is automatically parsed and found in request.data
  const { prompt } = request.data;
  
  if (!prompt) {
    throw new HttpsError("invalid-argument", "The function must be called with a 'prompt'.");
  }

  try {
    // Pull the secret from your standalone Vault Project at runtime
    const vaultProjectId = 'company-api-vault-12345'; // <-- Use your actual Vault Project ID, ideally as an environment variable
    const name = `projects/${vaultProjectId}/secrets/GEMINI_API_KEY/versions/latest`;
    
    const [version] = await secretClient.accessSecretVersion({ name });
    const apiKey = version.payload.data.toString('utf8');

    // Initialise the Gemini SDK with the fetched key
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Request content generation from the model
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    // Return the response object back to the front-end website
    return { text: response.text };

  } catch (error) {
    console.error("Gemini Backend Error:", error);
    throw new HttpsError("internal", "Failed to generate content from Gemini.");
  }
});