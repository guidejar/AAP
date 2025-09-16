/**
 * 파일명: api.js
 * 목적: Google Generative AI API와의 통신을 담당합니다.
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-14 14:09 - 초기 생성: VV3.md에서 API 호출 로직 분리
 * 2025-09-14 14:35 - v4 아키텍처 리팩토링: 2-API 구조에 맞게 API 호출 함수 재설계
 * =====================
 */

import * as state from './state.js';

/**
 * 텍스트 기반 Generative API를 호출하는 범용 함수 (v4)
 * @param {object[]} context - API에 전달할 컨텍스트 (대화 기록 등)
 * @param {string} systemPrompt - AI에게 역할을 부여하는 시스템 프롬프트
 * @param {boolean} useApiKey - 사용자의 API 키를 사용할지 여부. false일 경우 키 없이 Flash 모델 호출.
 * @returns {Promise<string|null>} AI가 생성한 텍스트 또는 실패 시 null
 */
export async function callGenerativeAPI(context, systemPrompt, useApiKey) {
    // 1. API 키 사용 여부에 따라 모델과 키 결정
    const modelName = useApiKey ? 'gemini-1.5-pro-latest' : 'gemini-1.5-flash-latest';
    const key = useApiKey ? state.userApiKey : '';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

    // 2. API에 전송할 데이터(payload) 구성
    const payload = {
        contents: context,
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        }
    };

    try {
        // 3. fetch API를 사용하여 서버에 POST 요청 전송
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 4. 응답 상태 확인
        if (!response.ok) {
            console.error(`API Error (${modelName}):`, await response.text());
            return null;
        }

        // 5. 응답 결과를 JSON으로 파싱하고 텍스트 부분만 추출하여 반환
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (error) {
        console.error(`API Call Error (${modelName}):`, error);
        return null;
    }
}

/**
 * 이미지 생성을 위해 Generative Language API를 호출하는 함수 (v4)
 * @param {object} promptData - 프롬프트 템플릿과 데이터가 결합된 JSON 객체
 * @param {Array<{id: string, base64Data: string}>} referenceImages - 참조 이미지 데이터 배열
 * @returns {Promise<string|null>} 생성된 이미지의 Data URL 또는 실패 시 null
 */
export async function callImageAPI(promptData, referenceImages = []) {
    // v4 아키텍처에서는 항상 API 키 없이 Flash 모델을 사용합니다.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateImage?key=`;

    // 1. API payload의 'parts' 배열을 구성합니다.
    const parts = [];

    // 2. 첫 번째 part로, 프롬프트 JSON 객체를 문자열로 변환하여 추가합니다.
    parts.push({ text: JSON.stringify(promptData) });

    // 3. 두 번째 part부터, 참조 이미지들을 첨부합니다.
    if (referenceImages && referenceImages.length > 0) {
        referenceImages.forEach(img => {
            if (img && img.base64Data) {
                parts.push({ inlineData: { mimeType: "image/png", data: img.base64Data } });
            }
        });
    }

    // 4. 최종 payload를 구성합니다.
    const payload = {
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE'] }
    };

    try {
        // 5. API를 호출합니다.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("Image API Error:", await response.text());
            return null;
        }

        // 6. 결과에서 이미지 데이터를 추출하고 Data URL 형식으로 변환하여 반환합니다.
        const result = await response.json();
        const imagePart = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart) {
            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        }

        console.error("Image API Error: No image data in response", result);
        return null;
    } catch (error) {
        console.error("Image API Call Error:", error);
        return null;
    }
}
