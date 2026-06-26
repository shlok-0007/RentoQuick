/**
 * Groq AI Verification Service
 *
 * Calls the Groq API to verify whether a product exists in the
 * consumer market and returns structured verification data.
 *
 * Environment variable:
 * GROQ_API_KEY — Your Groq API key
 */

const OpenAI = require('openai');

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: '[https://api.groq.com/openai/v1](https://api.groq.com/openai/v1)',
});

const SYSTEM_PROMPT = `You are a product verification assistant for a rental marketplace.
Given a product title and description, verify if this product exists in the consumer market.

Return ONLY a valid JSON object with these exact keys:
{
  "isValid": boolean,
  "confidenceScore": number (0-100),
  "standardizedCategory": string (e.g. "Electronics & Gadgets", "Cameras & Photography"),
  "suggestedThumbnail": string (a publicly accessible image URL if available, otherwise empty string),
  "suggestedDescription": string (a concise 1-2 sentence product description if valid),
  "suggestedFeatures": string[] (array of 3-6 key features if valid)
}

Rules:
- isValid should be true only if you are confident this is a real, identifiable consumer product.
- confidenceScore reflects how certain you are about the product's existence.
- standardizedCategory should match common marketplace categories.
- If the product seems fabricated, vague, or non-existent, set isValid to false.
- Return ONLY the JSON object, nothing else.`;

/**
 * Verify a product using the Groq API.
 * @param {{ title: string, description: string }} product
 * @returns {Promise<{
 * isValid: boolean,
 * confidenceScore: number,
 * standardizedCategory: string,
 * suggestedThumbnail: string,
 * suggestedDescription: string,
 * suggestedFeatures: string[],
 * verifiedAt: string
 * } | null>}
 */
async function verifyProduct(product) {
    if (!process.env.GROQ_API_KEY) {
        console.warn('[GroqVerify] GROQ_API_KEY not set — skipping verification');
        return null;
    }

    const { title, description } = product;

    if (!title || title.trim().length < 2) {
        return null;
    }

    const userMessage = `Product Title: "${title}"\nProduct Description: "${description || 'N/A'}"`;

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userMessage }
            ],
            // Ye ensure karega ki model strictly JSON return kare bina kisi markdown ke
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 512,
        });

        const content = completion.choices[0].message.content;
        const result = JSON.parse(content);

        // Validate and normalise the result
        return {
            isValid: Boolean(result.isValid),
            confidenceScore: Number(result.confidenceScore) || 0,
            standardizedCategory: String(result.standardizedCategory || ''),
            suggestedThumbnail: String(result.suggestedThumbnail || ''),
            suggestedDescription: String(result.suggestedDescription || ''),
            suggestedFeatures: Array.isArray(result.suggestedFeatures)
                ? result.suggestedFeatures.map(String)
                : [],
            verifiedAt: new Date().toISOString(),
        };
    } catch (err) {
        console.error('[GroqVerify] Error:', err.message);
        return null;
    }
}

module.exports = { verifyProduct };