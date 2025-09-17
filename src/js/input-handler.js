/**
 * 파일명: input-handler.js
 * 목적: 새로운 레이아웃의 입력창 동적 확장 및 툴바 기능 처리
 * 작성일: 2025-09-17
 */

import * as dom from './dom.js';

/**
 * 입력 및 툴바 관련 이벤트 리스너를 초기화합니다.
 */
export function initializeInputHandler() {
    if (dom.userInput) {
        dom.userInput.addEventListener('input', handleInputResize);
        dom.userInput.addEventListener('keydown', handleKeyboardShortcuts);
    }
    
    dom.toolbarBtns?.forEach(btn => {
        btn.addEventListener('click', handleToolbarClick);
    });

    // 설정 모달 닫기 버튼
    if (dom.closeSettingsBtn) {
        dom.closeSettingsBtn.addEventListener('click', () => {
            dom.settingsModal.classList.add('hidden');
        });
    }
}

/**
 * 입력창 크기를 내용에 따라 동적으로 조절합니다.
 */
function handleInputResize() {
    if (!dom.userInput) return;
    
    dom.userInput.style.height = 'auto';
    const scrollHeight = dom.userInput.scrollHeight;
    const maxHeight = 160; // 10rem (style.css와 일치)
    
    dom.userInput.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
}

/**
 * 키보드 단축키를 처리합니다. (Enter로 전송)
 */
function handleKeyboardShortcuts(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        dom.storyForm?.requestSubmit();
    }
}

/**
 * 툴바 버튼 클릭을 처리합니다.
 */
function handleToolbarClick(e) {
    const button = e.currentTarget;
    const action = button.dataset.action;

    if (!action) return;

    if (action === 'settings') {
        dom.settingsModal.classList.toggle('hidden');
    } else {
        showToolbarModal(action);
    }
}

/**
 * 이미지 영역 위에 툴바 모달을 표시합니다.
 * @param {string} action - 표시할 모달의 종류 (inventory, status, skills)
 */
function showToolbarModal(action) {
    // 기존 모달 제거
    const existingModal = dom.imageArea.querySelector('.toolbar-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'toolbar-modal';

    let title = '';
    let content = '';

    switch (action) {
        case 'inventory':
            title = '🎒 인벤토리';
            content = '<p>현재 소지품이 없습니다.</p>'; // TODO: 실제 데이터 연동
            break;
        case 'status':
            title = '📊 캐릭터 상태';
            content = '<p>주인공은 건강한 상태입니다.</p>'; // TODO: 실제 데이터 연동
            break;
        case 'skills':
            title = '⚔️ 스킬';
            content = '<p>특별한 스킬을 배우지 않았습니다.</p>'; // TODO: 실제 데이터 연동
            break;
    }

    modal.innerHTML = `
        <div class="flex justify-between items-center border-b border-gray-700 pb-4 mb-4">
            <h3 class="text-2xl font-bold">${title}</h3>
            <button id="close-toolbar-modal" class="p-2 rounded-full hover:bg-gray-700 text-4xl leading-none -mt-2">&times;</button>
        </div>
        <div>${content}</div>
    `;

    dom.imageArea.appendChild(modal);

    // 닫기 버튼에 이벤트 리스너 추가
    modal.querySelector('#close-toolbar-modal').addEventListener('click', () => {
        modal.remove();
    });
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const toolbarModal = document.querySelector('.toolbar-modal');
        if (toolbarModal) {
            toolbarModal.remove();
        }
        if (!dom.settingsModal.classList.contains('hidden')) {
            dom.settingsModal.classList.add('hidden');
        }
    }
});
