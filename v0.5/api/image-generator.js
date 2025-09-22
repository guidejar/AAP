import { callGenerativeAPIWithFallback } from './api-fallback.js';
import { configState } from '../core/state/config-state.js';
import { imageTemplates } from '../core/constants/image-templates.js';

export async function generateImage(assetId, assetType, description) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${configState.apiKey ? 'gemini-2.5-pro' : 'gemini-2.5-flash-image-preview'}:generateContent?key=${configState.apiKey || 'YOUR_DEFAULT_API_KEY'}`;

    let prompt;
    switch (assetType) {
        case 'key_visual':
            prompt = imageTemplates.key_visual(description);
            break;
        case 'three_view_reference':
            prompt = imageTemplates.three_view_reference(description);
            break;
        case 'head_portrait':
            prompt = imageTemplates.head_portrait(description);
            break;
        case 'illustration':
            prompt = imageTemplates.illustration(description);
            break;
        default:
            prompt = description; // Fallback to raw description
    }

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
        })
    };

    try {
        const response = await callGenerativeAPIWithFallback(url, options, !!configState.apiKey, true);
        // Assuming the response structure for image generation will contain a URL or base64 data
        // For now, we'll return a placeholder URL.
        const imageUrl = `https://example.com/generated-image-${assetId}-${assetType}-${Date.now()}.png`;
        return { assetId, assetType, imageUrl, model: response.model };
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
}