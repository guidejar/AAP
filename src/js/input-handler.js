import * as dom from './dom.js';

function showToolbarModal(action) {
    const existingModal = document.querySelector('.toolbar-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'toolbar-modal';
    
    let content = '';
    switch (action) {
        case 'inventory':
            content = `
                <div class="flex justify-between items-center border-b border-gray-700 pb-4 mb-4">
                    <h3 class="text-2xl font-bold">🎒 인벤토리</h3>
                    <button class="close-modal text-4xl hover:text-gray-300 cursor-pointer">&times;</button>
                </div>
                <p class="text-lg">현재 소지품이 없습니다.</p>
                <p class="text-gray-400 mt-2">아이템을 획득하면 여기에 표시됩니다.</p>
            `;
            break;
        case 'status':
            content = `
                <div class="flex justify-between items-center border-b border-gray-700 pb-4 mb-4">
                    <h3 class="text-2xl font-bold">📊 캐릭터 상태</h3>
                    <button class="close-modal text-4xl hover:text-gray-300 cursor-pointer">&times;</button>
                </div>
                <div class="space-y-4">
                    <div class="flex justify-between">
                        <span class="text-lg">체력 (HP):</span>
                        <span class="text-green-400 font-bold">100/100</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-lg">마나 (MP):</span>
                        <span class="text-blue-400 font-bold">50/50</span>
                    </div>
                    <p class="text-gray-400">주인공은 건강한 상태입니다.</p>
                </div>
            `;
            break;
        case 'skills':
            content = `
                <div class="flex justify-between items-center border-b border-gray-700 pb-4 mb-4">
                    <h3 class="text-2xl font-bold">⚔️ 스킬</h3>
                    <button class="close-modal text-4xl hover:text-gray-300 cursor-pointer">&times;</button>
                </div>
                <p class="text-lg">배운 스킬이 없습니다.</p>
                <p class="text-400 mt-2">새로운 스킬을 배우면 여기에 표시됩니다.</p>
            `;
            break;
        case 'settings':
            // 설정 모달은 별도로 처리되므로 여기서는 비워둡니다.
            break;
        default:
            content = `<p>알 수 없는 메뉴: ${action}</p>`;
    }

    modal.innerHTML = `
        <div class="toolbar-modal-content bg-gray-800 p-6 rounded-lg shadow-xl w-11/12 md:w-1/2 lg:w-1/3 max-h-[80vh] overflow-y-auto relative">
            ${content}
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.close-modal')?.addEventListener('click', () => {
        modal.remove();
    });

    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

export function initializeInputHandler(sendFunction) {
    // 메인 메뉴 버튼 이벤트 리스너
    dom.mainMenuBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            if (action === 'settings') {
                dom.settingsModal.classList.toggle('hidden');
            } else {
                showToolbarModal(action);
            }
        });
    });

    // 입력창 자동 높이 조절
    if (dom.userInput) {
        dom.userInput.addEventListener('input', handleInputResize);
        // 초기 로드 시 높이 조절
        handleInputResize();
    }

    // 전송 버튼 클릭 및 Enter 키 입력 처리
    if (dom.storyForm) {
        dom.storyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendFunction();
        });
        dom.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                dom.storyForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }
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
}

function handleInputResize() {
    if (!dom.userInput) return;
    dom.userInput.style.height = 'auto';
    dom.userInput.style.height = (dom.userInput.scrollHeight) + 'px';
}