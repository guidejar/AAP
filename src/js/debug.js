/**
 * 파일명: debug.js
 * 목적: 강화된 디버깅 기능 - 이미지 프롬프트 추적, API 호출 로깅, 성능 측정, 에러 추적
 * 작성일: 2025-09-18
 *
 * === 변경 히스토리 ===
 * 2025-09-18 - 초기 생성: D4 요구사항에 따른 디버그 기능 대폭 강화
 * =====================
 */

import * as state from './state.js';

/**
 * 디버그 로그 저장소
 */
export const debugLog = {
    apiCalls: [],
    imagePrompts: [],
    processingTimes: [],
    errors: [],
    performanceMarks: new Map()
};

/**
 * 성능 측정 시작
 */
export function startPerformanceMark(operation) {
    const markId = `${operation}_${Date.now()}`;
    debugLog.performanceMarks.set(operation, {
        markId,
        startTime: performance.now(),
        operation
    });
    return markId;
}

/**
 * 성능 측정 완료 및 로깅
 */
export function endPerformanceMark(operation) {
    const mark = debugLog.performanceMarks.get(operation);
    if (!mark) return null;

    const duration = performance.now() - mark.startTime;
    const logEntry = {
        operation,
        duration: Math.round(duration * 100) / 100,
        timestamp: new Date().toISOString(),
        markId: mark.markId
    };

    debugLog.processingTimes.push(logEntry);
    debugLog.performanceMarks.delete(operation);

    console.log(`🕐 성능: ${operation} 소요시간 ${logEntry.duration}ms`);
    return logEntry;
}

/**
 * API 호출 로깅 (성공/실패)
 */
export function logApiCall(type, modelName, success, details = {}) {
    const logEntry = {
        type, // 'text' | 'image'
        modelName,
        success,
        timestamp: new Date().toISOString(),
        duration: details.duration || null,
        requestSize: details.requestSize || null,
        responseSize: details.responseSize || null,
        statusCode: details.statusCode || null,
        errorMessage: details.errorMessage || null,
        errorBody: details.errorBody || null,
        stackTrace: details.stackTrace || null,
        payload: details.payload || null
    };

    debugLog.apiCalls.push(logEntry);

    if (success) {
        console.log(`✅ API 성공: ${type} (${modelName}) - ${logEntry.duration}ms`);
    } else {
        console.error(`❌ API 오류: ${type} (${modelName}) - ${logEntry.errorMessage}`);
        if (logEntry.errorBody) {
            console.error('오류 내용:', logEntry.errorBody);
        }
        if (logEntry.stackTrace) {
            console.error('스택 추적:', logEntry.stackTrace);
        }
    }

    return logEntry;
}

/**
 * 이미지 프롬프트 로깅 (가장 중요한 기능)
 */
export function logImagePrompt(cacheKey, promptData, naturalPrompt, referenceImages = [], result = null) {
    const logEntry = {
        cacheKey,
        timestamp: new Date().toISOString(),
        mission: promptData.mission || 'N/A',
        role: promptData.role || 'N/A',
        styleDirective: promptData.style_directive || 'N/A',
        formatDirective: promptData.format_directive || 'N/A',
        detailFocus: promptData.detail_focus || 'N/A',
        sizeDirective: promptData.size_directive || 'N/A',
        situationalOverride: promptData.situational_override || 'N/A',
        compositionRule: promptData.composition_rule || 'N/A',
        attachmentMapping: promptData.attachment_mapping || 'N/A',
        dataPayload: promptData.data_payload || null,
        sceneTextPayload: promptData.scene_text_payload || 'N/A',
        qualityRequirements: promptData.quality_requirements || 'N/A',
        technicalSpecs: promptData.technical_specs || 'N/A',
        contentPolicy: promptData.content_policy || 'N/A',
        naturalPrompt: naturalPrompt,
        referenceImageCount: referenceImages.length,
        referenceImageIds: referenceImages.map(img => img.id || 'unknown'),
        success: result !== null,
        errorMessage: result === null ? 'Image generation failed' : null,
        resultDataSize: result ? result.length : 0
    };

    debugLog.imagePrompts.push(logEntry);

    console.log(`🖼️ 이미지 프롬프트 기록됨: ${cacheKey}`);
    console.log(`자연어 프롬프트:`, naturalPrompt);

    return logEntry;
}

/**
 * 에러 상세 로깅
 */
export function logError(operation, error, context = {}) {
    const logEntry = {
        operation,
        message: error.message,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        isDebugMode: state.isDebugMode
    };

    debugLog.errors.push(logEntry);

    console.error(`💥 ${operation}에서 오류 발생:`, error);
    console.error('컨텍스트:', context);
    console.error('스택:', error.stack);

    return logEntry;
}

/**
 * 디버그 로그 내보내기 (JSON 형태)
 */
export function exportDebugLog() {
    const exportData = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        debugMode: state.isDebugMode,
        logs: {
            apiCalls: debugLog.apiCalls,
            imagePrompts: debugLog.imagePrompts,
            processingTimes: debugLog.processingTimes,
            errors: debugLog.errors
        },
        summary: {
            totalApiCalls: debugLog.apiCalls.length,
            successfulApiCalls: debugLog.apiCalls.filter(call => call.success).length,
            failedApiCalls: debugLog.apiCalls.filter(call => !call.success).length,
            totalImagePrompts: debugLog.imagePrompts.length,
            successfulImagePrompts: debugLog.imagePrompts.filter(prompt => prompt.success).length,
            totalErrors: debugLog.errors.length,
            averageApiDuration: debugLog.apiCalls.length > 0
                ? Math.round((debugLog.apiCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / debugLog.apiCalls.length) * 100) / 100
                : 0
        }
    };

    return exportData;
}

/**
 * 디버그 로그 다운로드
 */
export function downloadDebugLog() {
    const data = exportDebugLog();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('🔽 디버그 로그 다운로드됨');
}

/**
 * 디버그 로그 초기화
 */
export function clearDebugLog() {
    debugLog.apiCalls.length = 0;
    debugLog.imagePrompts.length = 0;
    debugLog.processingTimes.length = 0;
    debugLog.errors.length = 0;
    debugLog.performanceMarks.clear();

    console.log('🧹 디버그 로그 초기화됨');
}

/**
 * 실시간 디버그 통계
 */
export function getDebugStats() {
    const recentApiCalls = debugLog.apiCalls.filter(call =>
        Date.now() - new Date(call.timestamp).getTime() < 300000 // 최근 5분
    );

    return {
        session: {
            totalApiCalls: debugLog.apiCalls.length,
            totalImagePrompts: debugLog.imagePrompts.length,
            totalErrors: debugLog.errors.length,
            currentOperations: debugLog.performanceMarks.size
        },
        recent: {
            apiCallsLast5Min: recentApiCalls.length,
            avgResponseTime: recentApiCalls.length > 0
                ? Math.round((recentApiCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / recentApiCalls.length) * 100) / 100
                : 0,
            successRate: recentApiCalls.length > 0
                ? Math.round((recentApiCalls.filter(call => call.success).length / recentApiCalls.length) * 100)
                : 100
        }
    };
}