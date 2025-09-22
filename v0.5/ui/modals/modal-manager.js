
// modal-manager.js: 모달의 DOM 조작과 사용자 입력 처리를 담당하는 '뷰' 역할
export class ModalManager {
    constructor() {
        // DOM 요소
        this.settingsModal = null;
        this.contentModal = null;
        this.closeSettingsModalBtn = null;
        this.closeContentModalBtn = null;
        this.settingsBtn = null;
        this.switchToOverlayBtn = null;

        // 콜백
        this.onStateChange = null;
    }

    init() {
        try {
            this.settingsModal = document.getElementById('settings-modal');
            this.contentModal = document.getElementById('content-modal');
            this.closeSettingsModalBtn = document.getElementById('close-modal-btn');
            this.closeContentModalBtn = document.getElementById('close-content-modal-btn');
            this.settingsBtn = document.getElementById('settings-btn');
            this.switchToOverlayBtn = document.getElementById('switch-to-overlay-btn');

            console.log('ModalManager DOM elements:', {
                settingsModal: !!this.settingsModal,
                contentModal: !!this.contentModal,
                closeSettingsModalBtn: !!this.closeSettingsModalBtn,
                closeContentModalBtn: !!this.closeContentModalBtn,
                settingsBtn: !!this.settingsBtn,
                switchToOverlayBtn: !!this.switchToOverlayBtn
            });

            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing ModalManager:', error);
        }
    }

    setCallbacks(callbacks) {
        this.onStateChange = callbacks.onStateChange;
    }

    setupEventListeners() {
        try {
            console.log('Setting up event listeners...');

            // 설정 모달 - null 체크 추가
            if (this.settingsBtn) {
                console.log('Adding settingsBtn listener');
                this.settingsBtn.addEventListener('click', () => this.openSettingsModal());
            }
            if (this.closeSettingsModalBtn) {
                console.log('Adding closeSettingsModalBtn listener');
                this.closeSettingsModalBtn.addEventListener('click', () => this.closeSettingsModal());
            }
            if (this.settingsModal) {
                console.log('Adding settingsModal listener');
                this.settingsModal.addEventListener('click', (e) => {
                    if (e.target === this.settingsModal) this.closeSettingsModal();
                });
            }

            // 콘텐츠 모달 - null 체크 추가
            if (this.closeContentModalBtn) {
                console.log('Adding closeContentModalBtn listener');
                this.closeContentModalBtn.addEventListener('click', () => {
                    if (this.onStateChange) this.onStateChange('requestSoftCloseContentModal');
                });
            }
            if (this.contentModal) {
                console.log('Adding contentModal listener');
                this.contentModal.addEventListener('click', (e) => {
                    if (e.target === this.contentModal && this.onStateChange) {
                        this.onStateChange('requestSoftCloseContentModal');
                    }
                });
            }
            if (this.switchToOverlayBtn) {
                console.log('Adding switchToOverlayBtn listener');
                this.switchToOverlayBtn.addEventListener('click', () => {
                    if (this.onStateChange) this.onStateChange('requestSwitchToOverlay');
                });
            }

            // 키보드 이벤트
            console.log('Adding keyboard listener');
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.onStateChange) {
                    this.onStateChange('escKeyPressed');
                }
            });

            console.log('Event listeners setup completed');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    // --- Public Methods ---

    showContentModal(data) {
        const titleElement = document.getElementById('content-modal-title');
        const bodyElement = document.getElementById('content-modal-body');

        if (titleElement) titleElement.textContent = data.title;
        if (bodyElement) bodyElement.innerHTML = this.generateContentList(data);

        this.updateSwitchButtonState();

        if (this.contentModal) {
            this.contentModal.classList.remove('hidden');
        }
    }

    hideContentModal() {
        if (this.contentModal) {
            this.contentModal.classList.add('hidden');
        }
    }

    openSettingsModal() {
        if (this.settingsModal) {
            this.settingsModal.classList.remove('hidden');
        }
        if (this.onStateChange) {
            this.onStateChange('updateResizerState');
        }
    }

    closeSettingsModal() {
        if (this.settingsModal) {
            this.settingsModal.classList.add('hidden');
        }
        if (this.onStateChange) {
            this.onStateChange('updateResizerState');
        }
    }

    updateSwitchButtonState() {
        if (!this.onStateChange || !this.switchToOverlayBtn) return;

        const panelWidths = this.onStateChange('getPanelWidths');
        if (panelWidths && panelWidths.container < 768) {
            this.switchToOverlayBtn.classList.add('hidden');
            return;
        }
        this.switchToOverlayBtn.classList.remove('hidden');
        const isEnabled = panelWidths && panelWidths.right >= 300;
        this.switchToOverlayBtn.classList.toggle('btn-disabled', !isEnabled);
        this.switchToOverlayBtn.setAttribute('data-tooltip', isEnabled ? '패널로 보기' : '패널 너비가 부족하여 전환할 수 없습니다.');
    }
    
    generateContentList(data) {
        return `<ul class="space-y-3">${data.items.map(item => `<li class="p-4 rounded-lg hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-between hover:bg-[var(--bg-button-hover)]" style="background-color: var(--bg-button);"><span style="color: var(--text-primary);">${item}</span><svg class="w-4 h-4" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></li>`).join('')}</ul>`;
    }

    // --- State Getters ---

    isContentModalOpen() {
        return this.contentModal && !this.contentModal.classList.contains('hidden');
    }

    isSettingsModalOpen() {
        return this.settingsModal && !this.settingsModal.classList.contains('hidden');
    }
}
