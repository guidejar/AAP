/**
 * 파일명: utils.js
 * 목적: 데이터 파싱, 파일 저장/불러오기 등 보조 유틸리티 함수를 제공합니다. (v4 아키텍처)
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-14 14:10 - 초기 생성: VV3.md에서 파싱 및 파일 처리 로직 분리
 * 2025-09-14 15:00 - v4 리팩토링: DAD 스냅샷 구조에 맞게 저장/불러오기 로직 수정
 * =====================
 */

import * as state from './state.js';
import * as dom from './dom.js';
import { renderScene } from './ui.js';

/**
 * 캠페인 개요(brief) JSON 문자열을 파싱하는 함수
 * @param {string} jsonString - AI로부터 받은 캠페인 개요 JSON 문자열
 * @returns {object} 파싱된 JavaScript 객체
 */
export function parseCampaignBrief(jsonString) {
    try {
        const cleanedJsonString = jsonString.replace(/^```json\s*|```$/g, '').trim();
        return JSON.parse(cleanedJsonString);
    } catch (error) {
        console.error("CRITICAL: Failed to parse Campaign Brief JSON.", error);
        console.error("Raw AI Response for Brief:", jsonString);
        throw new Error("캠페인 개요 생성에 실패했습니다. AI가 유효한 JSON을 반환하지 않았습니다.");
    }
}

/**
 * AI 모델의 응답 JSON 문자열을 파싱하는 함수
 * @param {string} jsonString - AI로부터 받은 JSON 응답 문자열
 * @returns {object} 파싱된 JavaScript 객체 또는 에러 객체
 */
export function parseModelResponse(jsonString) {
    try {
        const cleanedJsonString = jsonString.replace(/^```json\s*|```$/g, '').trim();
        return JSON.parse(cleanedJsonString);
    } catch (error) {
        console.error("CRITICAL: Failed to parse AI JSON response.", error);
        console.error("Raw AI Response:", jsonString);
        // v4: 파싱 실패 시 반환하는 기본 객체 업데이트
        return {
            title: "오류: 데이터 파싱 실패",
            story: "AI로부터 유효한 JSON 응답을 받지 못했습니다. 디버그 모드에서 원본 응답을 확인해주세요.",
            choices: ["이전으로 돌아가기"],
            hints: {},
            taskQueue: [],
            displayImageId: null,
            evaluation: { plausibility: 5, importance: 1 }
        };
    }
}

/**
 * 현재까지의 이야기 진행 상황을 JSON 파일로 저장하는 함수 (v4)
 */
export function saveStory() {
    if (state.sceneArchive.length === 0) {
        alert("저장할 이야기가 없습니다.");
        return;
    }

    // v4: initialDadSnapshot을 저장하도록 변경
    const dataToSave = {
        sceneArchive: state.sceneArchive,
        currentSceneIndex: state.currentSceneIndex,
        imageCache: Object.fromEntries(state.imageCache),
        initialDadSnapshot: state.initialDadSnapshot 
    };

    const jsonString = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // v4: 파일명 변경
    a.download = `ai-novel-v4-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
}

/**
 * 사용자가 선택한 JSON 파일을 불러와 게임 상태를 복원하는 함수 (v4)
 * @param {Event} event - 파일 입력(input) 이벤트
 */
export function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // v4: 유효성 검사 시 sceneState 대신 dadSnapshot 확인
            if (data.sceneArchive && typeof data.currentSceneIndex !== 'undefined' && data.sceneArchive[0].dadSnapshot) {
                state.setSceneArchive(data.sceneArchive);
                state.setCurrentSceneIndex(data.currentSceneIndex);
                state.setImageCache(data.imageCache ? new Map(Object.entries(data.imageCache)) : new Map());
                // v4: initialDadSnapshot 복원
                state.setInitialDadSnapshot(data.initialDadSnapshot || data.sceneArchive[0].dadSnapshot); // 하위 호환성

                dom.setupScreen.classList.add('hidden');
                dom.storyScreen.classList.remove('hidden');
                dom.storyScreen.classList.add('grid');
                renderScene(state.currentSceneIndex);
            } else {
                alert("잘못된 파일 형식입니다. (v4 save file required)");
            }
        } catch (error) {
            console.error("Failed to load story file:", error);
            alert("파일을 불러오는 데 실패했습니다.");
        }
    };

    reader.readAsText(file);
    dom.loadInput.value = ''; // 다음 파일 로드를 위해 입력값 초기화
}
