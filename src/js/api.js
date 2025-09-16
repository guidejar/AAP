/**
 * 파일명: api.js
 * 목적: Google Generative AI API와의 통신을 담당합니다.
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-14 14:09 - 초기 생성: VV3.md에서 API 호출 로직 분리
 * 2025-09-14 14:35 - v4 아키텍처 리팩토링: 2-API 구조에 맞게 API 호출 함수 재설계
 * 2025-09-14 15:25 - note/gemini.md 명세에 따라 API 모델 버전을 특정 버전으로 고정
 * 2025-09-16 13:30 - 사용자 요구사항에 따라 API 모델 사용 정책 업데이트 및 오류 처리 강화
 * =====================
 */

import * as state from './state.js';

/**
 * 텍스트 기반 Generative API를 호출하는 범용 함수 (v4)
 * @param {object[]} context - API에 전달할 컨텍스트 (대화 기록 등)
 * @param {string} systemPrompt - AI에게 역할을 부여하는 시스템 프롬프트
 * @param {boolean} useApiKey - 사용자의 API 키를 사용할지 여부.
 * @returns {Promise<string|null>} AI가 생성한 텍스트 또는 실패 시 null
 */
export async function callGenerativeAPI(context, systemPrompt, useApiKey) {
    // 사용자 요구사항에 따라 API 키 사용 여부 및 유효성 검사
    if (useApiKey && !state.userApiKey) {
        alert("gemini-2.5-pro 모델을 사용하려면 API 키가 필요합니다. 설정 메뉴에서 API 키를 입력해주세요.");
        throw new Error("API 키가 설정되지 않았습니다.");
    }

    // 요구사항에 명시된 모델만 사용하도록 제한
    const modelName = useApiKey ? 'gemini-2.5-pro' : 'gemini-2.5-flash-preview-05-20';
    const key = useApiKey ? state.userApiKey : '';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

    const payload = {
        contents: context,
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API Error (${modelName}):`, errorBody);
            if (useApiKey && response.status === 400) {
                 alert("API 키가 잘못되었거나 권한이 없습니다. 설정 메뉴에서 올바른 키를 입력했는지 확인해주세요.");
            } else {
                 alert(`API 호출에 실패했습니다. (${modelName}, 상태: ${response.status})`);
            }
            return null;
        }

        const result = await response.json();
        if (!result.candidates || result.candidates.length === 0) {
            console.error(`API Error (${modelName}): 응답에 생성된 콘텐츠가 없습니다.`, result);
            const blockReason = result.promptFeedback?.blockReason;
            if (blockReason) {
                alert(`콘텐츠 생성에 실패했습니다. 이유: ${blockReason}`);
            } else {
                alert('API로부터 유효한 응답을 받지 못했습니다.');
            }
            return null;
        }
        return result.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error(`API Call Error (${modelName}):`, error);
        alert('API 호출 중 네트워크 오류 또는 알 수 없는 문제가 발생했습니다.');
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
    // note/gemini.md 명세에 따라 항상 API 키 없이 특정 이미지 모델을 사용합니다.
    const modelName = 'gemini-2.5-flash-image-preview';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=`;

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
