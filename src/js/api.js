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
 * 2025-09-16 13:45 - API 오류 처리를 위한 커스텀 에러 클래스 도입 및 재시도 로직 지원
 * =====================
 */

import * as state from './state.js';

/**
 * API 호출 시 발생하는 특정 오류를 식별하기 위한 커스텀 에러 클래스
 */
export class ApiError extends Error {
    constructor(message, status, modelName) {
        super(message);
        this.name = 'ApiError';
        this.status = status; // HTTP 상태 코드
        this.modelName = modelName; // 사용된 모델명
    }
}

/**
 * 텍스트 기반 Generative API를 호출하는 범용 함수 (v4)
 * @param {object[]} context - API에 전달할 컨텍스트
 * @param {string} systemPrompt - 시스템 프롬프트
 * @param {boolean} useApiKey - API 키 사용 여부
 * @returns {Promise<string>} AI가 생성한 텍스트
 * @throws {ApiError} API 호출 실패 시
 * @throws {Error} 그 외 네트워크 오류 등
 */
export async function callGenerativeAPI(context, systemPrompt, useApiKey) {
    if (useApiKey && !state.userApiKey) {
        throw new Error("API 키가 설정되지 않았습니다. 설정에서 키를 입력해주세요.");
    }

    const modelName = useApiKey ? 'gemini-2.5-pro' : 'gemini-2.5-flash-preview-05-20';
    const key = useApiKey ? state.userApiKey : '';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

    const payload = {
        contents: context,
        systemInstruction: { parts: [{ text: systemPrompt }] }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API Error (${modelName}, Status: ${response.status}):`, errorBody);
            throw new ApiError(`API 호출 실패`, response.status, modelName);
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            const blockReason = result.promptFeedback?.blockReason;
            if (blockReason) {
                throw new ApiError(`콘텐츠 생성 실패: ${blockReason}`, null, modelName);
            }
            console.error(`API Error (${modelName}): 응답에 텍스트 콘텐츠가 없습니다.`, result);
            throw new Error('API로부터 유효한 텍스트 응답을 받지 못했습니다.');
        }
        return text;

    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error(`API Call Error (${modelName}):`, error);
        throw new Error(`API 호출 중 네트워크 오류가 발생했습니다. (${modelName})`);
    }
}

/**
 * 이미지 생성을 위해 Generative Language API를 호출하는 함수 (v4)
 * @param {object} promptData - 프롬프트 데이터
 * @param {Array<{id: string, base64Data: string}>} referenceImages - 참조 이미지
 * @param {boolean} useApiKey - API 키 사용 여부
 * @returns {Promise<string>} 생성된 이미지의 Data URL
 * @throws {ApiError} API 호출 실패 시
 * @throws {Error} 그 외 네트워크 오류 등
 */
export async function callImageAPI(promptData, referenceImages = [], useApiKey = false) {
    if (useApiKey && !state.userApiKey) {
        throw new Error("API 키가 설정되지 않았습니다. 설정에서 키를 입력해주세요.");
    }

    // API 키 사용 시 Pro 모델, 미사용 시 Flash Image 모델 사용
    const modelName = useApiKey ? 'gemini-2.5-pro' : 'gemini-2.5-flash-image-preview';
    const key = useApiKey ? state.userApiKey : '';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

    const parts = [{ text: JSON.stringify(promptData) }];
    if (referenceImages?.length > 0) {
        referenceImages.forEach(img => {
            if (img?.base64Data) {
                parts.push({ inlineData: { mimeType: "image/png", data: img.base64Data } });
            }
        });
    }

    const payload = {
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE'] }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Image API Error (${modelName}, Status: ${response.status}):`, errorBody);
            throw new ApiError(`이미지 API 호출 실패`, response.status, modelName);
        }

        const result = await response.json();
        const imagePart = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (imagePart) {
            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        }

        console.error(`Image API Error (${modelName}): 응답에 이미지 데이터가 없습니다.`, result);
        throw new Error('이미지 API로부터 유효한 응답을 받지 못했습니다.');

    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error(`Image API Call Error (${modelName}):`, error);
        throw new Error(`이미지 API 호출 중 네트워크 오류가 발생했습니다. (${modelName})`);
    }
}
