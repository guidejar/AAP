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
import * as debug from './debug.js';

/**
 * 프롬프트 데이터를 나노바나나 친화적인 자연어로 변환하는 함수
 * @param {object} promptData - 프롬프트 템플릿 데이터
 * @returns {string} 자연어 프롬프트
 */
function buildNaturalPrompt(promptData) {
    let prompt = '';

    // 역할 정의
    if (promptData.role) {
        prompt += `${promptData.role}\n\n`;
    }

    // 미션/목표
    if (promptData.mission) {
        prompt += `Mission: ${promptData.mission}\n\n`;
    }

    // 스타일 지시사항
    if (promptData.style_directive) {
        prompt += `Style Guidelines: ${promptData.style_directive}\n\n`;
    }

    // 포맷 지시사항
    if (promptData.format_directive) {
        prompt += `Format Requirements: ${promptData.format_directive}\n\n`;
    }

    // 상세 포커스
    if (promptData.detail_focus) {
        prompt += `Detail Focus: ${promptData.detail_focus}\n\n`;
    }

    // 크기 지시사항
    if (promptData.size_directive) {
        prompt += `Size Guidelines: ${promptData.size_directive}\n\n`;
    }

    // 상황별 우선순위
    if (promptData.situational_override) {
        prompt += `Important Note: ${promptData.situational_override}\n\n`;
    }

    // 구성 규칙
    if (promptData.composition_rule) {
        prompt += `Composition Rule: ${promptData.composition_rule}\n\n`;
    }

    // 첨부파일 매핑
    if (promptData.attachment_mapping) {
        prompt += `Reference Images: ${promptData.attachment_mapping}\n\n`;
    }

    // 데이터 페이로드 (캐릭터, 아이템 등 정보)
    if (promptData.data_payload) {
        prompt += 'Subject Information:\n';
        const data = promptData.data_payload;

        if (data.name) prompt += `- Name: ${data.name}\n`;
        if (data.description) prompt += `- Description: ${data.description}\n`;
        if (data.appearance) prompt += `- Appearance: ${data.appearance}\n`;
        if (data.personality) prompt += `- Personality: ${data.personality}\n`;
        if (data.size) prompt += `- Size: ${data.size}\n`;
        if (data.genre) prompt += `- Genre: ${data.genre}\n`;
        if (data.adventure) prompt += `- Adventure Theme: ${data.adventure}\n`;

        // 키 캐릭터들
        if (data.keyCharacters && data.keyCharacters.length > 0) {
            prompt += '- Key Characters:\n';
            data.keyCharacters.forEach(char => {
                prompt += `  * ${char.name || 'Unnamed'}: ${char.description || 'No description'}\n`;
            });
        }

        // 키 아이템들
        if (data.keyItems && data.keyItems.length > 0) {
            prompt += '- Key Items:\n';
            data.keyItems.forEach(item => {
                prompt += `  * ${item.name || 'Unnamed'}: ${item.description || 'No description'}\n`;
            });
        }

        // 키 장소들
        if (data.keyLocations && data.keyLocations.length > 0) {
            prompt += '- Key Locations:\n';
            data.keyLocations.forEach(loc => {
                prompt += `  * ${loc.name || 'Unnamed'}: ${loc.description || 'No description'}\n`;
            });
        }

        prompt += '\n';
    }

    // 씬 텍스트 페이로드 (일러스트레이션용)
    if (promptData.scene_text_payload) {
        prompt += `Scene to Illustrate:\n"${promptData.scene_text_payload}"\n\n`;
    }

    // 품질 및 기술적 요구사항
    if (promptData.quality_requirements) {
        prompt += `Quality Requirements: ${promptData.quality_requirements}\n\n`;
    }

    if (promptData.technical_specs) {
        prompt += `Technical Specifications: ${promptData.technical_specs}\n\n`;
    }

    // 금지사항
    if (promptData.content_policy) {
        prompt += `Content Guidelines: ${promptData.content_policy}\n\n`;
    }

    return prompt.trim();
}

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
export async function callGenerativeAPI(context, systemPrompt, useApiKey = false, allowFallback = true) {
    const operation = 'text_api_call';
    const performanceMarkId = debug.startPerformanceMark(operation);

    // API 키 필요하지만 없는 경우
    if (useApiKey && !state.userApiKey) {
        throw new Error("API 키가 설정되지 않았습니다. 설정에서 키를 입력해주세요.");
    }

    return await callGenerativeAPIWithFallback(context, systemPrompt, useApiKey, allowFallback, operation);
}

/**
 * 폴백 로직을 포함한 내부 API 호출 함수
 */
async function callGenerativeAPIWithFallback(context, systemPrompt, useApiKey, allowFallback, operation) {
    const modelName = useApiKey ? 'gemini-2.5-pro' : 'gemini-2.5-flash-preview-05-20';
    const key = useApiKey ? state.userApiKey : '';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

    const payload = {
        contents: context,
        systemInstruction: { parts: [{ text: systemPrompt }] }
    };

    const requestBody = JSON.stringify(payload);
    const requestSize = new Blob([requestBody]).size;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
        });

        const performanceLog = debug.endPerformanceMark(operation);

        if (!response.ok) {
            const errorBody = await response.text();

            // 할당량 초과 감지 및 폴백 시도
            if (response.status === 429 && !useApiKey && allowFallback && state.userApiKey) {
                console.warn(`내부 텍스트 API 할당량 초과. API 키를 사용하여 재시도합니다.`);

                // 상세 API 에러 로깅 (폴백 시도 전)
                debug.logApiCall('text', modelName, false, {
                    duration: performanceLog?.duration,
                    requestSize,
                    statusCode: response.status,
                    errorMessage: `내부 API 할당량 초과, 사용자 API 키로 폴백 시도`,
                    errorBody,
                    payload: state.isDebugMode ? payload : null
                });

                // 사용자 API 키로 재시도
                return await callGenerativeAPIWithFallback(context, systemPrompt, true, false, operation);
            }

            // 상세 API 에러 로깅
            debug.logApiCall('text', modelName, false, {
                duration: performanceLog?.duration,
                requestSize,
                statusCode: response.status,
                errorMessage: `API 호출 실패 (${response.status})`,
                errorBody,
                payload: state.isDebugMode ? payload : null
            });

            console.error(`API Error (${modelName}, Status: ${response.status}):`, errorBody);
            throw new ApiError(`API 호출 실패`, response.status, modelName);
        }

        const result = await response.json();
        const responseSize = new Blob([JSON.stringify(result)]).size;
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            const blockReason = result.promptFeedback?.blockReason;
            const errorMessage = blockReason ? `콘텐츠 생성 실패: ${blockReason}` : '응답에 텍스트 콘텐츠가 없습니다';

            debug.logApiCall('text', modelName, false, {
                duration: performanceLog?.duration,
                requestSize,
                responseSize,
                statusCode: response.status,
                errorMessage,
                payload: state.isDebugMode ? payload : null
            });

            if (blockReason) {
                throw new ApiError(errorMessage, null, modelName);
            }
            console.error(`API Error (${modelName}): ${errorMessage}`, result);
            throw new Error('API로부터 유효한 텍스트 응답을 받지 못했습니다.');
        }

        // 성공 로깅
        debug.logApiCall('text', modelName, true, {
            duration: performanceLog?.duration,
            requestSize,
            responseSize,
            statusCode: response.status,
            payload: state.isDebugMode ? payload : null
        });

        return text;

    } catch (error) {
        // 네트워크 에러 등 예외적인 경우 로깅
        if (!(error instanceof ApiError)) {
            const performanceLog = debug.endPerformanceMark(operation);
            debug.logError(operation, error, {
                modelName,
                requestSize,
                useApiKey,
                systemPromptLength: systemPrompt?.length || 0,
                contextLength: JSON.stringify(context).length
            });

            debug.logApiCall('text', modelName, false, {
                duration: performanceLog?.duration,
                requestSize,
                errorMessage: error.message,
                stackTrace: error.stack,
                payload: state.isDebugMode ? payload : null
            });

            console.error(`API Call Error (${modelName}):`, error);
            throw new Error(`API 호출 중 네트워크 오류가 발생했습니다. (${modelName})`);
        }
        throw error;
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
export async function callImageAPI(promptData, referenceImages = [], useApiKey = false, cacheKey = null, allowFallback = true) {
    const operation = 'image_api_call';
    const performanceMarkId = debug.startPerformanceMark(operation);

    if (useApiKey && !state.userApiKey) {
        throw new Error("API 키가 설정되지 않았습니다. 설정에서 키를 입력해주세요.");
    }

    return await callImageAPIWithFallback(promptData, referenceImages, useApiKey, cacheKey, allowFallback, operation);
}

/**
 * 폴백 로직을 포함한 내부 이미지 API 호출 함수
 */
async function callImageAPIWithFallback(promptData, referenceImages, useApiKey, cacheKey, allowFallback, operation) {
    // API 키 사용 시 Pro 모델, 미사용 시 Flash Image 모델 사용
    const modelName = useApiKey ? 'gemini-2.5-pro' : 'gemini-2.5-flash-image-preview';
    const key = useApiKey ? state.userApiKey : '';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

    // JSON.stringify 대신 자연어 프롬프트 사용 (A6 해결)
    const naturalPrompt = buildNaturalPrompt(promptData);
    console.log(`Natural prompt for ${promptData.mission || 'image generation'}:`, naturalPrompt);

    const parts = [{ text: naturalPrompt }];
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

    const requestBody = JSON.stringify(payload);
    const requestSize = new Blob([requestBody]).size;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
        });

        const performanceLog = debug.endPerformanceMark(operation);

        if (!response.ok) {
            const errorBody = await response.text();

            // 할당량 초과 감지 및 폴백 시도
            if (response.status === 429 && !useApiKey && allowFallback && state.userApiKey) {
                console.warn(`내부 이미지 API 할당량 초과 (${cacheKey}). API 키를 사용하여 재시도합니다.`);

                // 이미지 프롬프트 폴백 시도 로깅
                debug.logImagePrompt(cacheKey || 'unknown', promptData, naturalPrompt, referenceImages, null);

                // API 호출 실패 로깅 (폴백 시도 전)
                debug.logApiCall('image', modelName, false, {
                    duration: performanceLog?.duration,
                    requestSize,
                    statusCode: response.status,
                    errorMessage: `내부 API 할당량 초과, 사용자 API 키로 폴백 시도`,
                    errorBody,
                    payload: state.isDebugMode ? payload : null
                });

                // 사용자 API 키로 재시도
                return await callImageAPIWithFallback(promptData, referenceImages, true, cacheKey, false, operation);
            }

            // 이미지 프롬프트 실패 로깅
            debug.logImagePrompt(cacheKey || 'unknown', promptData, naturalPrompt, referenceImages, null);

            // API 호출 실패 로깅
            debug.logApiCall('image', modelName, false, {
                duration: performanceLog?.duration,
                requestSize,
                statusCode: response.status,
                errorMessage: `이미지 API 호출 실패 (${response.status})`,
                errorBody,
                payload: state.isDebugMode ? payload : null
            });

            console.error(`Image API Error (${modelName}, Status: ${response.status}):`, errorBody);
            throw new ApiError(`이미지 API 호출 실패`, response.status, modelName);
        }

        const result = await response.json();
        const responseSize = new Blob([JSON.stringify(result)]).size;
        const imagePart = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (imagePart) {
            const dataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

            // 이미지 프롬프트 성공 로깅 (가장 중요한 기능)
            debug.logImagePrompt(cacheKey || 'unknown', promptData, naturalPrompt, referenceImages, dataUrl);

            // API 호출 성공 로깅
            debug.logApiCall('image', modelName, true, {
                duration: performanceLog?.duration,
                requestSize,
                responseSize,
                statusCode: response.status,
                payload: state.isDebugMode ? payload : null
            });

            return dataUrl;
        }

        // 응답에 이미지 데이터가 없는 경우
        debug.logImagePrompt(cacheKey || 'unknown', promptData, naturalPrompt, referenceImages, null);
        debug.logApiCall('image', modelName, false, {
            duration: performanceLog?.duration,
            requestSize,
            responseSize,
            statusCode: response.status,
            errorMessage: '응답에 이미지 데이터가 없습니다',
            payload: state.isDebugMode ? payload : null
        });

        console.error(`Image API Error (${modelName}): 응답에 이미지 데이터가 없습니다.`, result);
        throw new Error('이미지 API로부터 유효한 응답을 받지 못했습니다.');

    } catch (error) {
        if (!(error instanceof ApiError)) {
            const performanceLog = debug.endPerformanceMark(operation);

            // 네트워크 에러 등 예외적인 경우 로깅
            debug.logError(operation, error, {
                modelName,
                cacheKey,
                requestSize,
                useApiKey,
                naturalPromptLength: naturalPrompt?.length || 0,
                referenceImageCount: referenceImages.length,
                mission: promptData.mission
            });

            debug.logImagePrompt(cacheKey || 'unknown', promptData, naturalPrompt, referenceImages, null);
            debug.logApiCall('image', modelName, false, {
                duration: performanceLog?.duration,
                requestSize,
                errorMessage: error.message,
                stackTrace: error.stack,
                payload: state.isDebugMode ? payload : null
            });

            console.error(`Image API Call Error (${modelName}):`, error);
            throw new Error(`이미지 API 호출 중 네트워크 오류가 발생했습니다. (${modelName})`);
        }
        throw error;
    }
}
