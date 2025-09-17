/**
 * 파일명: input-handler.js
 * 목적: 새로운 레이아웃의 입력창 동적 확장 및 툴바 기능 처리
 * 작성일: 2025-09-17
 */

import * as dom from './dom.js';
import * as state from './state.js';

/**
 * 입력창 동적 확장 기능 초기화
 */
export function initializeInputHandler() {
    // 입력창 동적 크기 조절
    if (dom.userInput) {
        dom.userInput.addEventListener('input', handleInputResize);
        dom.userInput.addEventListener('keydown', handleKeyboardShortcuts);
        
        // 포커스 이벤트 처리
        dom.userInput.addEventListener('focus', () => {
            dom.inputPanel?.classList.add('focused');
        });
        
        dom.userInput.addEventListener('blur', () => {
            dom.inputPanel?.classList.remove('focused');
        });
    }
    
    // 툴바 버튼 이벤트 리스너
    dom.toolbarBtns?.forEach(btn => {
        btn.addEventListener('click', handleToolbarClick);
    });
    
    // 오버레이 닫기 버튼
    if (dom.closeOverlay) {
        dom.closeOverlay.addEventListener('click', hideToolbarOverlay);
    }
    
    // 오버레이 외부 클릭으로 닫기
    if (dom.toolbarOverlay) {
        dom.toolbarOverlay.addEventListener('click', (e) => {
            if (e.target === dom.toolbarOverlay) {
                hideToolbarOverlay();
            }
        });
    }
}

/**
 * 입력창 크기 동적 조절
 */
function handleInputResize() {
    if (!dom.userInput) return;
    
    // 높이 초기화
    dom.userInput.style.height = 'auto';
    
    // 스크롤 높이에 맞춰 조절 (최대 높이 제한)
    const maxHeight = 200; // 8rem 정도
    const scrollHeight = dom.userInput.scrollHeight;
    const newHeight = Math.min(scrollHeight, maxHeight);
    
    dom.userInput.style.height = newHeight + 'px';
    
    // 최대 높이에 도달하면 스크롤 표시
    if (scrollHeight > maxHeight) {
        dom.userInput.style.overflowY = 'auto';
    } else {
        dom.userInput.style.overflowY = 'hidden';
    }
}

/**
 * 키보드 단축키 처리
 */
function handleKeyboardShortcuts(e) {
    // Enter: 전송 (Shift+Enter: 줄바꿈)
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        dom.storyForm?.requestSubmit();
    }
}

/**
 * 툴바 버튼 클릭 처리
 */
function handleToolbarClick(e) {
    const button = e.currentTarget;
    const type = button.dataset.type;
    
    if (!type || !dom.toolbarOverlay || !dom.overlayContent || !dom.overlayTitle) return;

    // 콘텐츠 설정 (플레이스홀더)
    let title = '';
    let content = '';
    switch (type) {
        case 'inventory':
            title = '인벤토리';
            content = '<p>현재 소지품이 없습니다.</p>';
            break;
        case 'status':
            title = '캐릭터 상태';
            content = '<p>주인공은 건강한 상태입니다.</p>';
            break;
        case 'skills':
            title = '스킬';
            content = '<p>특별한 스킬을 배우지 않았습니다.</p>';
            break;
        case 'settings':
            title = '설정';
            content = '<p>게임 설정을 여기서 변경할 수 있습니다.</p>';
            break;
    }

    dom.overlayTitle.textContent = title;
    dom.overlayContent.innerHTML = content;
    
    showToolbarOverlay();
}

/**
 * 툴바 오버레이 표시
 */
function showToolbarOverlay() {
    if (!dom.toolbarOverlay) return;
    dom.toolbarOverlay.classList.remove('hidden');
    dom.toolbarOverlay.classList.add('flex');
}

/**
 * 툴바 오버레이 숨기기
 */
function hideToolbarOverlay() {
    if (!dom.toolbarOverlay) return;
    dom.toolbarOverlay.classList.add('hidden');
    dom.toolbarOverlay.classList.remove('flex');
}

// ESC 키로 오버레이 닫기
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.toolbarOverlay && !dom.toolbarOverlay.classList.contains('hidden')) {
        hideToolbarOverlay();
    }
});