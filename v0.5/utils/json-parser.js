// JSON Parser utility for handling AI responses with markdown formatting
export function parseJsonFromAIResponse(text) {
    if (!text) {
        throw new Error('Empty response text');
    }

    // Remove markdown JSON code blocks if present
    let cleanedText = text.trim();

    // Remove ```json and ``` markers
    if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Additional cleanup for common AI response artifacts
    cleanedText = cleanedText.trim();

    try {
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error('Failed to parse JSON:', cleanedText);
        throw new Error(`JSON parsing failed: ${error.message}`);
    }
}

// Fallback function that returns a default structure if parsing fails
export function parseJsonWithFallback(text, defaultStructure = {}) {
    try {
        return parseJsonFromAIResponse(text);
    } catch (error) {
        console.warn('JSON parsing failed, using fallback:', error.message);
        return defaultStructure;
    }
}