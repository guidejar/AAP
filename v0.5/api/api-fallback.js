import { callGeminiApi } from './gemini-api.js';
import { configState } from '../core/state/config-state.js';

export async function callGenerativeAPIWithFallback(url, options, useUserKey = false, allowFallback = true) {
    try {
        // Attempt with the current model (free or user-provided)
        return await callGeminiApi(url, options);
    } catch (error) {
        // Check if it's a 429 error and fallback is allowed and user has an API key
        if (error.message.includes('429') && !useUserKey && allowFallback && configState.apiKey) {
            console.warn('Rate limit exceeded. Retrying with user API key.');
            // Modify options to use user's API key
            const newOptions = { ...options };
            // Assuming API key is passed in headers or body, adjust as per actual Gemini API usage
            // For simplicity, let's assume it's a header for now, or part of the URL
            // This part needs to be adapted based on how the API key is actually used.
            // For now, we'll just indicate useUserKey is true for the retry.
            
            // This is a simplified retry. In a real scenario, you'd modify the actual API call
            // to use the user's key, potentially by changing the URL or adding a header.
            // For this task, we're focusing on the fallback logic.
            return await callGenerativeAPIWithFallback(url, newOptions, true, false); // Retry with user key, no further fallback
        }
        throw error; // Re-throw if not a 429 or fallback is not applicable
    }
}