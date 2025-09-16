/**
 * 파일명: ui.js
 * 목적: UI 렌더링, 사용자 상호작용 및 시각적 요소 제어 함수를 관리합니다. (v4 아키텍처)
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-14 14:08 - 초기 생성: VV3.md에서 UI 관련 로직 분리
 * 2025-09-14 14:55 - v4 리팩토링: DAD 스냅샷 및 새로운 scene 객체 구조에 맞게 렌더링 함수 수정
 * 2025-09-16 14:30 - UX 개선: 즉시 렌더링 및 전역 로딩 상태 UI 로직 추가
 * =====================
 */

import * as dom from './dom.js';
import * as state from './state.js';
import { processTurn } from './main.js';

/**
 * 특정 장면(scene)을 화면에 렌더링하는 함수 (v4)
 * @param {number} index - 렌더링할 장면의 sceneArchive 인덱스
 */
export function renderScene(index) {
    if (index < 0 || index >= state.sceneArchive.length) return;

    state.setCurrentSceneIndex(index);
    const scene = state.sceneArchive[index];
    const isLatestScene = index === state.sceneArchive.length - 1;

    // 1. 텍스트 정보 업데이트 (항상 가능)
    dom.sceneTitleEl.textContent = scene.title;
    dom.storyOutputEl.textContent = scene.story;

    // 2. 장면 데이터 완전성 여부에 따라 UI 분기 처리
    if (scene.isComplete) {
        // 2-1. 데이터가 완전한 경우: 최종 콘텐츠 렌더링
        const imageUrl = state.imageCache.get(scene.displayImageId);
        if (imageUrl && dom.illustrationEl.src !== imageUrl) {
            dom.illustrationEl.style.opacity = 0;
            setTimeout(() => { 
                dom.illustrationEl.src = imageUrl; 
                dom.illustrationEl.style.opacity = 1; 
            }, 300);
        }
        dom.imageLoader.classList.add('hidden');

        renderHintPanel(scene.hints);
        renderChoices(scene.choices);

    } else {
        // 2-2. 데이터가 불완전한 경우 (1차 API만 완료된 상태)
        dom.imageLoader.classList.remove('hidden');
        dom.imageLoaderText.textContent = "새로운 삽화 생성 중...";
        dom.hintPanel.innerHTML = '<div class="text-center text-gray-400 p-8">장면 분석 중...</div>';
        clearChoices();
    }

    // 3. UI 상태 업데이트 (입력창, 버튼 등)
    updateUiState(isLatestScene);
    
    // 4. 디버그 뷰 업데이트
    toggleDebugView(state.isDebugMode);
}

/**
 * 현재 씬 상태에 따라 UI의 각 부분을 업데이트하는 함수
 * @param {boolean} isLatestScene - 현재 보고 있는 장면이 최신 장면인지 여부
 */
function updateUiState(isLatestScene) {
    if (isLatestScene) {
        // 최신 장면: 분기 중이 아니라면 일반적인 입력 상태
        if (!state.isBranchingActive) {
            dom.pastActionContainer.classList.add('hidden');
            dom.branchBtn.classList.add('hidden');
            dom.inputContainer.classList.remove('hidden');
        }
    } else {
        // 과거 장면: 입력창 숨기고, 분기 관련 UI 표시
        dom.inputContainer.classList.add('hidden');
        dom.pastActionContainer.classList.remove('hidden');
        dom.branchBtn.classList.remove('hidden');
        dom.pastActionText.textContent = state.sceneArchive[state.currentSceneIndex + 1]?.user_input || '';
    }

    // 이전/다음 버튼 활성화/비활성화
    dom.prevBtn.disabled = state.currentSceneIndex === 0;
    dom.nextBtn.disabled = isLatestScene;

    // 전역 로딩 상태 업데이트
    updateGlobalLoadingState();
}

/**
 * 전역 생성 상태(isGenerating)에 따라 입력창의 로딩 UI를 업데이트하는 함수
 */
export function updateGlobalLoadingState() {
    const scene = state.sceneArchive[state.currentSceneIndex];
    const isLatestScene = state.currentSceneIndex === state.sceneArchive.length - 1;

    if (state.isGenerating && isLatestScene) {
        dom.inputLoader.classList.remove('hidden');
        dom.inputContainer.classList.add('hidden');
        dom.inputLoaderText.textContent = "장면 생성 중...";
        toggleInput(true);
    } else {
        dom.inputLoader.classList.add('hidden');
        // 과거 씬에서는 입력창이 항상 비활성화 상태여야 함
        if (isLatestScene) {
            dom.inputContainer.classList.remove('hidden');
            toggleInput(false);
            if (!state.isBranchingActive) dom.userInput.focus();
        } else {
            dom.inputContainer.classList.add('hidden');
        }
    }
}


/**
 * 힌트 패널을 생성하고 화면에 표시하는 함수
 */
function renderHintPanel(hints) {
    dom.hintPanel.innerHTML = '';
    if (!hints) return;

    let finalHtml = '';
    const enabledItemClasses = 'bg-gray-700/80 border-gray-600 hover:bg-gray-600 hover:border-gray-500 cursor-pointer';
    const disabledItemClasses = 'bg-gray-800/60 border-gray-700/50 text-gray-500 cursor-default';
    const infoItemClasses = 'bg-gray-700/40 border-gray-600 text-gray-300 cursor-default';

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
    
    finalHtml += createHintSection('스킬', hints.skills, 'skills');
    finalHtml += createHintSection('인벤토리', hints.inventory, 'inventory');

    dom.hintPanel.innerHTML = finalHtml;
    setupTooltipListeners();
}

function setupTooltipListeners() {
    const tooltipTriggers = document.querySelectorAll('.js-tooltip-trigger');
    tooltipTriggers.forEach(trigger => {
        trigger.addEventListener('mouseover', (e) => {
            const tooltipText = e.currentTarget.dataset.tooltip;
            dom.globalTooltip.textContent = tooltipText;
            dom.globalTooltip.classList.add('visible');
        });
        trigger.addEventListener('mousemove', (e) => {
            dom.globalTooltip.style.left = `${e.clientX + 15}px`;
            dom.globalTooltip.style.top = `${e.clientY + 15}px`;
        });
        trigger.addEventListener('mouseout', () => {
            dom.globalTooltip.classList.remove('visible');
        });
    });
}

export function showPageLoader(text) { 
    dom.pageLoaderText.textContent = text; 
    dom.pageLoader.classList.remove('hidden'); 
}

export function hidePageLoader() { 
    dom.pageLoader.classList.add('hidden'); 
}

function renderChoices(choices) {
    clearChoices();
    if (!choices || choices.length === 0) return;
    
    choices.forEach(choiceText => {
        const button = document.createElement('button');
        button.textContent = choiceText;
        button.className = "bg-indigo-500/60 hover:bg-indigo-500 text-white font-semibold py-1 px-3 rounded-full text-sm transition-colors";
        
        button.onclick = async () => {
            await processTurn(choiceText);
        };
        dom.choiceContainer.appendChild(button);
    });
}

export function clearChoices() { 
    dom.choiceContainer.innerHTML = ''; 
}

export function toggleInput(isDisabled) { 
    dom.userInput.disabled = isDisabled; 
    dom.sendBtn.disabled = isDisabled; 
}

export function toggleDebugView(show) {
    const scene = state.sceneArchive[state.currentSceneIndex];
    if (!scene) return;

    if (show) {
        dom.promptOverlay.textContent = `[DISPLAY_IMAGE_ID]: ${scene.displayImageId || 'N/A'}`;
        dom.promptOverlay.classList.remove('hidden');
        
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
