/**
 * 파일명: ui.js
 * 목적: UI 렌더링, 사용자 상호작용 및 시각적 요소 제어 함수를 관리합니다. (v4 아키텍처)
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-14 14:08 - 초기 생성: VV3.md에서 UI 관련 로직 분리
 * 2025-09-14 14:55 - v4 리팩토링: DAD 스냅샷 및 새로운 scene 객체 구조에 맞게 렌더링 함수 수정
 * =====================
 */

import * as dom from './dom.js';
import * as state from './state.js';
import { processTurn } from './main.js'; // main.js에서 processTurn 함수를 가져옴

/**
 * 특정 장면(scene)을 화면에 렌더링하는 함수 (v4)
 * @param {number} index - 렌더링할 장면의 sceneArchive 인덱스
 */
export function renderScene(index) {
    // 1. 유효한 인덱스인지 확인
    if (index < 0 || index >= state.sceneArchive.length) return;
    
    // 2. 현재 장면 인덱스 업데이트
    state.setCurrentSceneIndex(index);
    const scene = state.sceneArchive[index];
    const isLatestScene = index === state.sceneArchive.length - 1;

    // 3. 분기(branching) 상태 초기화
    if (!isLatestScene && state.isBranchingActive) {
        state.setIsBranchingActive(false);
        dom.userInput.placeholder = "다음 행동을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)";
    }

    // 4. 장면 삽화 업데이트
    // 이미지 캐시에서 이미지를 찾거나, 없으면 이전 이미지를 유지하거나 로딩 이미지를 표시
    const imageUrl = state.imageCache.get(scene.displayImageId) || (index > 0 ? dom.illustrationEl.src : "https://placehold.co/1200x1800/000000/FFF?text=Loading...");
    if (dom.illustrationEl.src !== imageUrl) {
        dom.illustrationEl.style.opacity = 0;
        setTimeout(() => { 
            dom.illustrationEl.src = imageUrl; 
            dom.illustrationEl.style.opacity = 1; 
        }, 300); // 0.3초 후에 부드럽게 나타나는 효과
    }
    
    // 5. 텍스트 정보 업데이트 (제목, 이야기)
    dom.sceneTitleEl.textContent = scene.title;
    dom.storyOutputEl.textContent = scene.story;
    
    // 6. 힌트 패널 렌더링
    renderHintPanel(scene.hints);

    // 7. UI 상태 업데이트 (입력창, 버튼 등)
    if (isLatestScene && !state.isBranchingActive) {
        // 최신 장면일 경우: 일반적인 입력 상태
        dom.inputContainer.classList.remove('hidden');
        dom.pastActionContainer.classList.add('hidden');
        dom.branchBtn.classList.add('hidden');
        renderChoices(scene.choices);
        toggleInput(false);
    } else if (state.isBranchingActive) {
        // 분기 중일 경우: 입력창만 활성화
        dom.pastActionContainer.classList.add('hidden');
        dom.branchBtn.classList.add('hidden');
        dom.inputContainer.classList.remove('hidden');
    } else { 
        // 과거 장면을 보고 있을 경우: 입력창 숨기고, 분기 버튼 표시
        dom.inputContainer.classList.add('hidden');
        dom.pastActionContainer.classList.remove('hidden');
        dom.branchBtn.classList.remove('hidden');
        dom.pastActionText.textContent = state.sceneArchive[index + 1].user_input;
    }
    
    // 8. 이전/다음 버튼 활성화/비활성화
    dom.prevBtn.disabled = index === 0;
    dom.nextBtn.disabled = isLatestScene;
    
    // 9. 디버그 뷰 업데이트
    toggleDebugView(state.isDebugMode);
}

/**
 * 힌트 패널을 생성하고 화면에 표시하는 함수
 * @param {object} hints - 캐릭터, 스킬, 인벤토리 힌트 정보가 담긴 객체
 */
function renderHintPanel(hints) {
    dom.hintPanel.innerHTML = '';
    if (!hints) return;

    let finalHtml = '';

    // CSS 클래스 정의
    const enabledItemClasses = 'bg-gray-700/80 border-gray-600 hover:bg-gray-600 hover:border-gray-500 cursor-pointer';
    const disabledItemClasses = 'bg-gray-800/60 border-gray-700/50 text-gray-500 cursor-default';
    const infoItemClasses = 'bg-gray-700/40 border-gray-600 text-gray-300 cursor-default';
    const baseItemClasses = 'inline-block py-1 px-3 rounded-full text-sm border transition-colors duration-200';

    // 캐릭터 힌트 생성
    if (hints.characters && hints.characters.length > 0) {
        finalHtml += `
            <div>
                <h3 class="font-bold text-xl mb-3 border-b border-gray-700 pb-2">캐릭터</h3>
                <div class="flex flex-wrap gap-2">
                    ${hints.characters.map(item => `
                        <span class="js-tooltip-trigger ${infoItemClasses}" data-tooltip="${item.tooltip || '정보 없음'}">
                            <span class="font-semibold text-white">${item.name || 'N/A'}</span>: ${item.status || ''}
                        </span>
                    `).join('')}
                </div>
            </div>`;
    }

    // 스킬, 인벤토리 힌트 섹션을 생성하는 헬퍼 함수
    const createHintSection = (title, items, category) => {
        if (!items || items.length === 0) return '';
        return `
            <div class="mt-6">
                <h3 class="font-bold text-xl mb-3 border-b border-gray-700 pb-2">${title}</h3>
                <div class="flex flex-wrap gap-2">
                    ${items.map(item => `
                        <span class="js-tooltip-trigger ${item.usable ? enabledItemClasses : disabledItemClasses}" data-tooltip="${item.tooltip || '정보 없음'}">
                            ${item.name || 'N/A'}
                            ${category === 'skills' && item.owner ? ` <span class="text-xs opacity-70">(${item.owner})</span>` : ''}
                        </span>
                    `).join('')}
                </div>
            </div>`;
    };
    
    // 스킬과 인벤토리 힌트 생성
    finalHtml += createHintSection('스킬', hints.skills, 'skills');
    finalHtml += createHintSection('인벤토리', hints.inventory, 'inventory');

    dom.hintPanel.innerHTML = finalHtml;
    setupTooltipListeners(); // 툴팁 이벤트 리스너 설정
}

/**
 * 툴팁(설명 말풍선)을 설정하는 함수
 */
function setupTooltipListeners() {
    const tooltipTriggers = document.querySelectorAll('.js-tooltip-trigger');
    tooltipTriggers.forEach(trigger => {
        // 마우스를 올렸을 때 툴팁 보이기
        trigger.addEventListener('mouseover', (e) => {
            const tooltipText = e.currentTarget.dataset.tooltip;
            dom.globalTooltip.textContent = tooltipText;
            dom.globalTooltip.classList.add('visible');
        });
        // 마우스 움직임에 따라 툴팁 위치 조절
        trigger.addEventListener('mousemove', (e) => {
            dom.globalTooltip.style.left = `${e.clientX + 15}px`;
            dom.globalTooltip.style.top = `${e.clientY + 15}px`;
        });
        // 마우스가 벗어났을 때 툴팁 숨기기
        trigger.addEventListener('mouseout', () => {
            dom.globalTooltip.classList.remove('visible');
        });
    });
}

/**
 * 전체 화면 로더를 보여주는 함수
 * @param {string} text - 로더에 표시할 텍스트
 */
export function showPageLoader(text) { 
    dom.pageLoaderText.textContent = text; 
    dom.pageLoader.classList.remove('hidden'); 
}

/**
 * 전체 화면 로더를 숨기는 함수
 */
export function hidePageLoader() { 
    dom.pageLoader.classList.add('hidden'); 
}

/**
 * 선택지 버튼들을 화면에 렌더링하는 함수
 * @param {string[]} choices - 선택지 텍스트 배열
 */
function renderChoices(choices) {
    clearChoices();
    if (!choices || choices.length === 0) return;
    
    choices.forEach(choiceText => {
        const button = document.createElement('button');
        button.textContent = choiceText;
        button.className = "bg-indigo-500/60 hover:bg-indigo-500 text-white font-semibold py-1 px-3 rounded-full text-sm transition-colors";
        
        // 버튼 클릭 시, 해당 선택지를 입력으로 다음 턴을 진행
        button.onclick = async () => {
            clearChoices();
            toggleLoading(true, "응답 생성 중...");
            await processTurn(choiceText);
        };
        dom.choiceContainer.appendChild(button);
    });
}

/**
 * 선택지 버튼들을 모두 삭제하는 함수
 */
export function clearChoices() { 
    dom.choiceContainer.innerHTML = ''; 
}

/**
 * 입력창 로딩 상태를 조절하는 함수
 * @param {boolean} isLoading - 로딩 중인지 여부
 * @param {string} text - 로딩 중에 표시할 텍스트
 */
export function toggleLoading(isLoading, text = "새로운 이야기를 생성하는 중...") {
    toggleInput(isLoading);
    dom.inputLoaderText.textContent = text;
    if (isLoading) {
        dom.inputContainer.classList.add('hidden');
        dom.inputLoader.classList.remove('hidden');
        dom.storyScreen.classList.add('loading-outline');
    } else {
        dom.inputContainer.classList.remove('hidden');
        dom.inputLoader.classList.add('hidden');
        dom.storyScreen.classList.remove('loading-outline');
        dom.userInput.focus();
    }
}

/**
 * 사용자 입력창과 전송 버튼의 활성화/비활성화 상태를 조절하는 함수
 * @param {boolean} isDisabled - 비활성화할지 여부
 */
export function toggleInput(isDisabled) { 
    dom.userInput.disabled = isDisabled; 
    dom.sendBtn.disabled = isDisabled; 
}

/**
 * 디버그 정보 뷰의 표시 여부를 조절하는 함수 (v4)
 * @param {boolean} show - 디버그 뷰를 표시할지 여부
 */
export function toggleDebugView(show) {
    const scene = state.sceneArchive[state.currentSceneIndex];
    if (!scene) return;

    if (show) {
        // 1. 디버그 정보를 각 요소에 채워넣기
        dom.promptOverlay.textContent = `[DISPLAY_IMAGE_ID]: ${scene.displayImageId || 'N/A'}`;
        dom.promptOverlay.classList.remove('hidden');
        
        // v4: 디버그 뷰에 1차, 2차 API의 원본 응답과 작업 큐를 표시
        dom.debugInputText.parentElement.querySelector('h4').textContent = 'DEBUG: 1차 API 응답 (서사)';
        dom.debugInputText.textContent = scene.raw_story_response || 'N/A';
        
        dom.debugOutputText.parentElement.querySelector('h4').textContent = 'DEBUG: 2차 API 응답 (분석)';
        dom.debugOutputText.textContent = scene.raw_analysis_response || 'N/A';
        
        dom.assetPipelineViewer.parentElement.querySelector('h4').textContent = 'DEBUG: 작업 큐 (Task Queue)';
        dom.assetPipelineViewer.textContent = JSON.stringify(scene.taskQueue, null, 2) || 'N/A';

        dom.imageCacheViewer.innerHTML = '';
        if (state.imageCache.size === 0) { 
            dom.imageCacheViewer.textContent = 'Image cache is empty.'; 
        } else {
            state.imageCache.forEach((base64Data, id) => {
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = id;
                link.className = 'text-cyan-400 hover:underline cursor-pointer';
                link.onclick = (e) => {
                    e.preventDefault();
                    dom.modalImageContent.src = base64Data;
                    dom.imageViewerModal.classList.remove('hidden');
                };
                dom.imageCacheViewer.appendChild(link);
            });
        }
        dom.debugOutputContainer.classList.remove('hidden');
    } else {
        dom.promptOverlay.classList.add('hidden');
        dom.debugOutputContainer.classList.add('hidden');
    }
}
