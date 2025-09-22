import { callGeminiApi } from './gemini-api.js';
// import { callGenerativeAPIWithFallback } from './api-fallback.js'; // 일시적인 비활성화
// import { configState } from '../core/state/config-state.js'; // 일시적인 비활성화

export async function generateText(context, systemPrompt, apiKey = '') {
    // Flash만 호출하도록 일시적인 설정
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: context,
            system_instruction: { parts: [{ text: systemPrompt }] }
        })
    };

    try {
        // const response = await callGenerativeAPIWithFallback(url, options, !!configState.apiKey, true); // 일시적인 비활성화
        const response = await callGeminiApi(url, options); // Flash 전용 호출
        return response.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error generating text:", error);
        throw error;
    }
}