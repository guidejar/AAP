
// panel-controller.js: 앱의 핵심 상태와 로직을 관리하는 '두뇌' 역할
export class PanelController {
    constructor() {
        // DOM 요소
        this.overlayPanel = null;
        this.mobileImagePlaceholder = null;
        this.rightPanelContent = null;
        this.iconButtons = {};

        // 데이터
        this.contentData = {
            pages: { title: '페이지 목록', items: ['첫 번째 페이지', '알파 테스트', 'UI/UX 개선안', '기획서 초안', '사용자 피드백 정리'] },
            icon1: { title: '아이콘 1: 관련 항목', items: ['항목 A', '항목 B', '항목 C'] },
            icon2: { title: '아이콘 2: 파일 목록', items: ['document.pdf', 'spreadsheet.xlsx', 'image_asset.png'] },
            icon3: { title: '아이콘 3: 설정 옵션', items: ['일반 설정', '알림 설정', '계정 관리'] }
        };

        // 상태 변수
        this.panelWidthThreshold = 300;
        this.currentOverlayKey = null;
        this.currentContentData = null;
        this.viewModePreference = 'auto';
        this.pinState = 'unpinned'; // 'unpinned', 'panel', 'content'
        this.pinnedKey = null;

        // 콜백
        this.onStateChange = null;
    }

    init() {
        this.overlayPanel = document.getElementById('overlay-panel');
        this.mobileImagePlaceholder = document.getElementById('mobile-image-placeholder');
        this.rightPanelContent = document.getElementById('right-panel-content');
        this.iconButtons = {
            pages: document.getElementById('header-title'),
            icon1: document.getElementById('icon-btn-1'),
            icon2: document.getElementById('icon-btn-2'),
            icon3: document.getElementById('icon-btn-3'),
        };
        this.setupEventListeners();
    }

    setCallbacks(callbacks) {
        this.onStateChange = callbacks.onStateChange;
    }

    setupEventListeners() {
        Object.keys(this.iconButtons).forEach(key => {
            if (this.iconButtons[key]) {
                this.iconButtons[key].addEventListener('click', () => this.handleToggleContent(this.contentData[key], key));
            }
        });
    }

    // --- Public Methods / Event Handlers ---

    handleToggleContent(data, key) {
        const modalState = this.onStateChange('getModalState');

        if (this.currentOverlayKey === key && modalState.isContentModalOpen) {
            this.handleModalSoftClose();
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

    handleModalSoftClose() {
        this.onStateChange('hideContentModal');
        this.currentOverlayKey = this.pinnedKey;
        this.updateActiveIconState();
        this.onStateChange('updateResizerState');
    }
    
    handleEscKey() {
        if (this.isOverlayOpen() && this.pinState === 'unpinned') {
            this.closeAndResetState();
            return true; // Handled
        }
        return false; // Not handled
    }

    switchToOverlayView() {
        const panelWidths = this.onStateChange('getPanelWidths');
        if (panelWidths.right < this.panelWidthThreshold) return;

        this.viewModePreference = 'panel';
        this.pinState = 'unpinned';
        this.pinnedKey = null;
        this.hideAllViews();
        this.showContent(this.currentContentData, this.currentOverlayKey);
    }

    // --- Private-like Methods ---

    showContent(data, key) {
        if (this.pinState === 'content' && this.pinnedKey && key !== this.pinnedKey) {
            this.currentOverlayKey = key;
            this.onStateChange('showContentModal', data);
            this.updateActiveIconState();
            this.onStateChange('updateResizerState');
            return;
        }

        this.currentOverlayKey = key;
        this.currentContentData = data;

        const panelWidths = this.onStateChange('getPanelWidths');
        const isPanelPossible = panelWidths.right >= this.panelWidthThreshold && panelWidths.container >= 768;

        if ((this.viewModePreference === 'auto' && isPanelPossible) || (this.viewModePreference === 'panel' && isPanelPossible)) {
            this.populateOverlay(data);
            this.overlayPanel.classList.remove('overlay-hidden');
        } else {
            this.onStateChange('showContentModal', data);
        }

        this.updatePlaceholderVisibility();
        this.updateActiveIconState();
        this.onStateChange('updateResizerState');
    }

    hideAllViews() {
        this.overlayPanel.classList.add('overlay-hidden');
        this.onStateChange('hideContentModal');
        this.updatePlaceholderVisibility();
        this.onStateChange('updateResizerState');
    }

    closeAndResetState() {
        this.hideAllViews();
        this.pinState = 'unpinned';
        this.pinnedKey = null;
        this.currentOverlayKey = null;
        this.currentContentData = null;
        this.updateActiveIconState();
    }

    populateOverlay(data) {
        this.overlayPanel.innerHTML = `<div class="flex flex-col h-full w-full">
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
        document.getElementById('close-overlay-btn').addEventListener('click', () => this.closeAndResetState());
        document.getElementById('switch-to-modal-btn').addEventListener('click', () => this.switchToModalView());
        document.getElementById('pin-btn').addEventListener('click', () => this.togglePinState());
        this.updatePinButtonUI();
    }
    
    switchToModalView() {
        this.viewModePreference = 'modal';
        this.pinState = 'unpinned';
        this.pinnedKey = null;
        this.hideAllViews();
        this.showContent(this.currentContentData, this.currentOverlayKey);
    }

    togglePinState() {
        const states = ['unpinned', 'panel', 'content'];
        const currentIndex = states.indexOf(this.pinState);
        this.pinState = states[(currentIndex + 1) % states.length];
        this.pinnedKey = (this.pinState === 'content') ? this.currentOverlayKey : null;
        this.updatePinButtonUI();
        this.updatePlaceholderVisibility();
        this.updateActiveIconState();
    }

    updatePinButtonUI() {
        const pinBtn = document.getElementById('pin-btn');
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
    }

    updateActiveIconState() {
        Object.values(this.iconButtons).forEach(btn => btn.classList.remove('active-icon-btn', 'active-icon'));
        const keysToHighlight = new Set([this.pinnedKey, this.currentOverlayKey].filter(Boolean));
        keysToHighlight.forEach(key => {
            if (this.iconButtons[key]) {
                const activeBtn = this.iconButtons[key];
                if (activeBtn.tagName === 'BUTTON') activeBtn.classList.add('active-icon-btn');
                else activeBtn.classList.add('active-icon');
            }
        });
    }

    updatePlaceholderVisibility() {
        const isPinnedOverlayVisible = this.isOverlayOpen() && this.pinState !== 'unpinned';
        this.mobileImagePlaceholder.classList.toggle('hidden', !isPinnedOverlayVisible);
        if (this.pinState === 'unpinned') {
             this.rightPanelContent.classList.remove('hidden');
        } else if (isPinnedOverlayVisible) {
             this.rightPanelContent.classList.add('hidden');
        }
    }
    
    handleLayoutChange(action, data) {
        if (action === 'resize' && this.isOverlayOpen() && data.rightWidth < this.panelWidthThreshold && this.viewModePreference === 'auto') {
            this.switchToModalView();
        } else if (action === 'reset') {
            this.viewModePreference = 'auto';
            this.closeAndResetState();
        }
    }

    generateContentList(data) {
        return `<ul class="space-y-3">${data.items.map(item => `<li class="p-4 rounded-lg hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-between hover:bg-[var(--bg-button-hover)]" style="background-color: var(--bg-button);"><span style="color: var(--text-primary);">${item}</span><svg class="w-4 h-4" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></li>`).join('')}</ul>`;
    }

    isOverlayOpen() {
        return !this.overlayPanel.classList.contains('overlay-hidden');
    }
}
