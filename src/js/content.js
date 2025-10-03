// 콘텐츠 관리 모듈
export const ContentManager = {
    panelWidthThreshold: 300,
    currentOverlayKey: null,
    currentContentData: null,
    viewModePreference: 'auto',
    pinState: 'unpinned', // 'unpinned', 'panel', 'content'
    pinnedKey: null,

    contentData: {
        pages: { title: '페이지 목록', items: ['첫 번째 페이지', '알파 테스트', 'UI/UX 개선안', '기획서 초안', '사용자 피드백 정리'] },
        icon1: { title: '아이콘 1: 관련 항목', items: ['항목 A', '항목 B', '항목 C'] },
        icon2: { title: '아이콘 2: 파일 목록', items: ['document.pdf', 'spreadsheet.xlsx', 'image_asset.png'] },
        icon3: { title: '아이콘 3: 설정 옵션', items: ['일반 설정', '알림 설정', '계정 관리'] }
    },

    init(elements, callbacks) {
        this.elements = elements;
        this.callbacks = callbacks;

        const iconButtons = {
            pages: document.getElementById('header-title'),
            icon1: document.getElementById('icon-btn-1'),
            icon2: document.getElementById('icon-btn-2'),
            icon3: document.getElementById('icon-btn-3'),
        };

        this.iconButtons = iconButtons;

        // pages는 PageManager가 처리하므로 제외
        Object.keys(iconButtons).forEach(key => {
            if (key === 'pages') return; // PageManager에서 처리
            iconButtons[key].addEventListener('click', () => this.handleToggleContent(this.contentData[key], key));
        });

        // 텍스트 입력창 자동 높이 조절
        const textarea = document.getElementById('autoHeightTextarea');
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
        });

        // 이벤트 위임: overlayPanel의 버튼 클릭 처리 (한 번만 등록)
        elements.overlayPanel.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            if (target.id === 'close-overlay-btn') {
                this.closeAndResetState();
            } else if (target.id === 'switch-to-modal-btn') {
                this.switchToModalView();
            } else if (target.id === 'pin-btn') {
                this.togglePinState();
            }
        });
    },

    generateContentList(data) {
        return `<ul class="space-y-3">${data.items.map(item => `<li class="p-4 rounded-lg hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-between hover:bg-[var(--bg-button-hover)]" style="background-color: var(--bg-button);"><span style="color: var(--text-primary);">${item}</span><svg class="w-4 h-4" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></li>`).join('')}</ul>`;
    },

    populateModal(data) {
        // DOM 요소 캐싱
        const modalTitle = this.elements.contentModal.querySelector('#content-modal-title');
        const modalBody = this.elements.contentModal.querySelector('#content-modal-body');

        if (modalTitle) modalTitle.textContent = data.title;
        if (modalBody) modalBody.innerHTML = this.generateContentList(data);
        this.callbacks.updateSwitchButtonState();
    },

    populateOverlay(data) {
        const { overlayPanel } = this.elements;
        overlayPanel.innerHTML = `<div class="flex flex-col h-full w-full">
            <div class="flex-shrink-0 flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold" style="color: var(--text-accent);">${data.title}</h3>
                <div class="flex items-center gap-1">
                    <button id="pin-btn" class="p-2 rounded-md hover:bg-[var(--bg-button-hover)] transition-colors" data-tooltip-position="bottom"></button>
                    <button id="switch-to-modal-btn" class="p-2 rounded-md hover:bg-[var(--bg-button-hover)] transition-colors" data-tooltip="모달로 보기" data-tooltip-position="bottom"><svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5 0V6.75A2.25 2.25 0 0011.25 4.5H7.5" /></svg></button>
                    <button id="close-overlay-btn" class="p-2 rounded-md hover:bg-[var(--bg-button-hover)] transition-colors" data-tooltip="닫기" data-tooltip-position="bottom"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                </div>
            </div>
            <div class="flex-1 overflow-y-auto pr-2">${this.generateContentList(data)}</div>
        </div>`;

        // 이벤트 리스너는 init()에서 이벤트 위임으로 한 번만 등록됨
        this.updatePinButtonUI();
    },

    togglePinState() {
        const states = ['unpinned', 'panel', 'content'];
        const currentIndex = states.indexOf(this.pinState);
        this.pinState = states[(currentIndex + 1) % states.length];

        if (this.pinState === 'content') {
            this.pinnedKey = this.currentOverlayKey;
        } else {
            this.pinnedKey = null;
        }

        this.updatePinButtonUI();
        this.callbacks.updatePlaceholderVisibility();
        this.updateActiveIconState();
    },

    updatePinButtonUI() {
        // DOM 요소 캐싱
        const pinBtn = this.elements.overlayPanel.querySelector('#pin-btn');
        if (!pinBtn) return;

        let svgHTML, tooltip;
        if (this.pinState === 'unpinned') {
            tooltip = '패널 고정';
            svgHTML = `<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17.5V22M10 17.5h4M10 10.5c-1.7 0-3 1.3-3 3v4h10v-4c0-1.7-1.3-3-3-3h-4Z"></path><path d="M10 10.5V5a2 2 0 1 1 4 0v5.5"></path></svg>`;
        } else if (this.pinState === 'panel') {
            tooltip = '콘텐츠 고정';
            svgHTML = `<svg class="w-5 h-5" style="fill: currentColor; stroke: currentColor;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17.5V22M10 17.5h4M10 10.5c-1.7 0-3 1.3-3 3v4h10v-4c0-1.7-1.3-3-3-3h-4Z"></path><path d="M10 10.5V5a2 2 0 1 1 4 0v5.5"></path></svg>`;
        } else {
            tooltip = '콘텐츠 고정 중: 다른 항목은 모달로 열립니다.';
            svgHTML = `<svg class="w-5 h-5" style="fill: var(--text-accent); stroke: var(--text-accent);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17.5V22M10 17.5h4M10 10.5c-1.7 0-3 1.3-3 3v4h10v-4c0-1.7-1.3-3-3-3h-4Z"></path><path d="M10 10.5V5a2 2 0 1 1 4 0v5.5"></path></svg>`;
        }
        pinBtn.innerHTML = svgHTML;
        pinBtn.setAttribute('data-tooltip', tooltip);
    },

    updateActiveIconState() {
        Object.values(this.iconButtons).forEach(btn => {
            btn.classList.remove('active-icon-btn', 'active-icon');
        });

        const keysToHighlight = new Set();
        if (this.pinnedKey) {
            keysToHighlight.add(this.pinnedKey);
        }
        if (this.currentOverlayKey) {
            keysToHighlight.add(this.currentOverlayKey);
        }

        keysToHighlight.forEach(key => {
            if (this.iconButtons[key]) {
                const activeBtn = this.iconButtons[key];
                if (activeBtn.tagName === 'BUTTON') {
                    activeBtn.classList.add('active-icon-btn');
                } else {
                    activeBtn.classList.add('active-icon');
                }
            }
        });
    },

    switchToModalView() {
        this.viewModePreference = 'modal';
        this.pinState = 'unpinned';
        this.pinnedKey = null;
        this.hideAllViews();
        this.showContent(this.currentContentData, this.currentOverlayKey);
    },

    switchToOverlayView() {
        const { switchToOverlayBtn } = this.elements;
        if (switchToOverlayBtn.classList.contains('btn-disabled')) return;
        this.viewModePreference = 'panel';
        this.pinState = 'unpinned';
        this.pinnedKey = null;
        this.hideAllViews();
        this.showContent(this.currentContentData, this.currentOverlayKey);
    },

    showContent(data, key) {
        const { contentModal, overlayPanel, rightPanel, mainContainer } = this.elements;

        if (this.pinState === 'content' && this.pinnedKey && key !== this.pinnedKey) {
            this.currentOverlayKey = key;
            this.populateModal(data);
            contentModal.classList.remove('hidden');
            this.updateActiveIconState();
            this.callbacks.updateResizerState();

            // 페이지 목록인 경우 PageManager에 알림
            if (key === 'pages' && window.PageManager) {
                setTimeout(() => {
                    // DOM 요소 캐싱
                    const modalBody = this.elements.contentModal.querySelector('#content-modal-body');
                    const listItems = modalBody ? modalBody.querySelectorAll('li') : [];
                    if (listItems.length > 0 && window.PageManager.setupPageListItems) {
                        console.log('[ContentManager] Notifying PageManager to setup items (pinned case)');
                        window.PageManager.setupPageListItems(listItems);
                    }
                }, 100);
            }
            return;
        }

        this.currentOverlayKey = key;
        this.currentContentData = data;

        const isPanelPossible = rightPanel.offsetWidth >= this.panelWidthThreshold && mainContainer.offsetWidth >= 768;
        if ((this.viewModePreference === 'auto' && isPanelPossible) || (this.viewModePreference === 'panel' && isPanelPossible)) {
            this.populateOverlay(data);
            overlayPanel.classList.remove('overlay-hidden');
        } else {
            this.populateModal(data);
            contentModal.classList.remove('hidden');
        }
        this.callbacks.updatePlaceholderVisibility();
        this.callbacks.updateResizerState();
        this.updateActiveIconState();

        // 페이지 목록인 경우 PageManager에 알림 (이벤트 리스너 재등록용)
        if (key === 'pages' && window.PageManager) {
            setTimeout(() => {
                // DOM 요소 캐싱
                const modalBody = this.elements.contentModal.querySelector('#content-modal-body');
                const modalItems = modalBody ? modalBody.querySelectorAll('li') : [];
                const overlayItems = this.elements.overlayPanel.querySelectorAll('li');
                const listItems = [...modalItems, ...overlayItems];

                if (listItems.length > 0 && window.PageManager.setupPageListItems) {
                    console.log('[ContentManager] Notifying PageManager to setup items');
                    window.PageManager.setupPageListItems(listItems);
                }
            }, 100);
        }
    },

    hideAllViews() {
        const { overlayPanel, contentModal } = this.elements;
        overlayPanel.classList.add('overlay-hidden');
        contentModal.classList.add('hidden');
        this.callbacks.updatePlaceholderVisibility();
        this.callbacks.updateResizerState();
    },

    closeAndResetState() {
        this.hideAllViews();
        this.pinState = 'unpinned';
        this.pinnedKey = null;
        this.currentOverlayKey = null;
        this.currentContentData = null;
        this.updateActiveIconState();
    },

    closeContentModalOnly() {
        const { contentModal } = this.elements;
        contentModal.classList.add('hidden');
        this.currentOverlayKey = this.pinnedKey;
        this.updateActiveIconState();
        this.callbacks.updateResizerState();
    },

    handleToggleContent(data, key) {
        const { contentModal } = this.elements;

        if (this.currentOverlayKey === key && !contentModal.classList.contains('hidden')) {
            this.closeContentModalOnly();
            return;
        }

        if (this.currentOverlayKey === key) {
            if (this.pinState === 'unpinned') {
                this.closeAndResetState();
            }
        } else {
            if (this.pinState === 'unpinned') {
                this.hideAllViews();
            }
            this.showContent(data, key);
        }
    }
};
