/**
 * 파일명: main.js
 * 목적: 애플리케이션의 메인 로직, 게임 흐름 제어, 이벤트 리스너 등록을 담당합니다. (v4 아키텍처)
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-17 - v4 레이아웃 리팩토링 완료 및 저장/불러오기 기능 연결
 * =====================
 */

import * as dom from './dom.js';
import * as state from './state.js';
import * as cfg from './config.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as utils from './utils.js';
import { initializeInputHandler } from './input-handler.js';

// --- SECTION: 핵심 게임 흐름 (Orchestrator) (v4) ---

async function startGame() {
    try {
        const genre = dom.genreInput.value;
        const adventure = dom.adventureInput.value;
        if (!genre || !adventure) {
            alert('장르와 모험 내용을 모두 입력해주세요.');
            return;
        }

        ui.showPageLoader("세계관 구성 중...");
        const worldBuildContext = [{ role: "user", parts: [{ text: `장르: ${genre}\n모험: ${adventure}` }] }];
        
        const briefJsonResponse = await api.callGenerativeAPI(worldBuildContext, cfg.worldBuilderSystemPrompt, !!state.userApiKey);
        
        if (!briefJsonResponse) throw new Error("캠페인 생성 AI로부터 응답을 받지 못했습니다.");

        const initialDadSnapshot = utils.parseCampaignBrief(briefJsonResponse);
        initialDadSnapshot.genre = genre;
        initialDadSnapshot.adventure = adventure;
        state.setInitialDadSnapshot(initialDadSnapshot);

        dom.setupScreen.classList.add('hidden');
        dom.storyScreen.classList.remove('hidden');

        await processTurn(`모험이 시작됩니다. 당신은 방금 생성된 세계관에 따라 이야기를 진행해야 합니다. 주인공을 '새로운 핵심 등장인물'로 설정하고, 이 세계관에 어울리는 이름, 성별, 배경, 직업, 스킬, 초기 인벤토리를 부여하세요. 그리고 첫 번째 모험의 시작을 아주 흥미진진하게 묘사해주세요.`);

    } catch (error) {
        console.error("게임 시작 중 오류 발생:", error);
        alert(`오류가 발생했습니다: ${error.message}`);
        ui.hidePageLoader();
    }
}

export async function processTurn(userInput) {
    if (state.isGenerating) return;
    state.setGenerating(true);
    ui.updateGlobalLoadingState();

    try {
        const newSceneIndex = state.currentSceneIndex + 1;
        const history = state.getHistoryForAPI(newSceneIndex);
        const turnContext = [...history, { role: "user", parts: [{ text: userInput }] }];

        const dadSnapshot = state.getLatestDadSnapshot();
        const systemPrompt = ui.getSystemPrompt(dadSnapshot);

        // 1차 API 호출 (스토리 생성)
        const storyResponse = await api.callGenerativeAPI(turnContext, systemPrompt, !!state.userApiKey);
        if (!storyResponse) throw new Error("스토리 생성 AI로부터 응답을 받지 못했습니다.");

        const newScene = ui.createSceneFromStoryResponse(storyResponse, userInput, newSceneIndex);
        state.addScene(newScene);
        ui.renderScene(newSceneIndex);

        // 2차 API 호출 (백그라운드 분석)
        api.analyzeAndProcessScene(newScene, dadSnapshot);

    } catch (error) {
        console.error("진행 중 오류 발생:", error);
        alert(`오류가 발생했습니다: ${error.message}`);
        state.setGenerating(false);
        ui.updateGlobalLoadingState();
    }
}

// --- SECTION: 이벤트 리스너 초기화 ---

function initializeEventListeners() {
    // 시작 화면
    dom.startBtn.addEventListener('click', startGame);
    dom.loadBtn.addEventListener('click', () => dom.loadInput.click());
    dom.loadInput.addEventListener('change', utils.handleFileLoad);

    // 스토리 화면
    dom.storyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (dom.userInput.value.trim()) {
            processTurn(dom.userInput.value.trim());
            dom.userInput.value = '';
            // 입력 후 텍스트창 높이 초기화
            const event = new Event('input', { bubbles: true });
            dom.userInput.dispatchEvent(event);
        }
    });

    // 네비게이션
    dom.prevBtn.addEventListener('click', () => ui.renderScene(state.currentSceneIndex - 1));
    dom.nextBtn.addEventListener('click', () => ui.renderScene(state.currentSceneIndex + 1));
    
    // 설정 모달 내 저장/불러오기
    dom.saveBtn.addEventListener('click', utils.saveStory);
    dom.loadModalBtn.addEventListener('click', () => dom.loadInput.click());

    // 입력 및 툴바 핸들러 초기화
    initializeInputHandler();

    // 이벤트 위임을 사용하여 선택지 클릭 처리
    const choicesContainer = document.getElementById('choices-container');
    if (choicesContainer) {
        choicesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('choice-button')) {
                const textInput = document.getElementById('text-input');
                if(textInput){
                    textInput.value = e.target.textContent.trim().replace('💬', '').trim();
                    textInput.focus();
                    textInput.dispatchEvent(new Event('input', { bubbles: true })); // 입력창 확장 로직 트리거
                }
            }
        });
    }
}

// 예시 선택지 렌더링 함수 (실제 데이터는 API로부터 받아옴)
function renderChoices(choices) {
    const choicesContainer = document.getElementById('choices-container');
    if (!choicesContainer) return;
    choicesContainer.innerHTML = ''; // 기존 선택지 초기화
    choices.forEach(choice => {
        const button = document.createElement('button');
        button.className = 'choice-button';
        button.textContent = `💬 \"${choice}\"`;
        choicesContainer.appendChild(button);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    // --- 테스트용 코드 ---
    renderChoices(['마을로 간다', '숲을 탐험한다', '휴식을 취한다']);
});