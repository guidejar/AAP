// 디버그 기능 관리 모듈
export const DebugManager = {
    enabled: true, // 디버그 모드 (기본값: 켜짐)
    logs: [], // 입출력 로그 저장
    elements: null,
    callbacks: null,

    init(elements, callbacks) {
        this.elements = elements;
        this.callbacks = callbacks;

        // localStorage에서 디버그 설정 불러오기
        const savedDebug = localStorage.getItem('debug_enabled');
        if (savedDebug !== null) {
            this.enabled = savedDebug === 'true';
        }

        // 디버그 토글 체크박스 상태 설정
        if (elements.debugToggle) {
            elements.debugToggle.checked = this.enabled;
            elements.debugToggle.addEventListener('change', (e) => {
                this.toggleDebug(e.target.checked);
            });
        }

        // 디버그 버튼 클릭 이벤트
        if (elements.debugBtn) {
            elements.debugBtn.addEventListener('click', () => this.handleToggleDebug());
        }

        // 디버그 모달 닫기 버튼
        if (elements.closeDebugModalBtn) {
            elements.closeDebugModalBtn.addEventListener('click', () => this.closeDebugModal());
        }

        // 디버그 패널 전환 버튼
        if (elements.switchDebugToOverlayBtn) {
            elements.switchDebugToOverlayBtn.addEventListener('click', () => this.switchToOverlay());
        }
    },

    toggleDebug(enabled) {
        this.enabled = enabled;
        localStorage.setItem('debug_enabled', enabled.toString());

        // 디버그 버튼 표시/숨김
        if (this.elements.debugBtn) {
            this.elements.debugBtn.style.display = enabled ? '' : 'none';
        }
    },

    // API 입출력 로그 기록
    logAPI(type, data) {
        if (!this.enabled) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            type: type, // 'request', 'response', 'error'
            data: data,
            page: window.PageManager ? window.PageManager.currentPageIndex : 0,
            temporary: true // 새 페이지 생성 전까지는 임시
        };

        this.logs.push(logEntry);

        // 최대 100개까지만 저장
        if (this.logs.length > 100) {
            this.logs.shift();
        }
    },

    // 마지막 로그들의 페이지 번호 업데이트 (새 페이지 생성 시)
    updateLastLogsPage(newPageIndex) {
        // 임시로 표시된 최근 로그들을 새 페이지로 이동
        for (let i = this.logs.length - 1; i >= 0; i--) {
            if (this.logs[i].temporary) {
                this.logs[i].page = newPageIndex;
                this.logs[i].temporary = false;
            } else {
                break; // 임시가 아닌 로그를 만나면 중단
            }
        }
    },

    // 디버그 버튼 클릭 처리 (아이콘 버튼과 동일한 방식)
    handleToggleDebug() {
        if (!this.enabled) return;

        const isModalVisible = !this.elements.debugModal.classList.contains('hidden');
        const isOverlayVisible = !this.elements.overlayPanel.classList.contains('overlay-hidden');
        const currentContent = this.elements.overlayPanel.getAttribute('data-content');

        // 디버그 모달이 이미 열려있으면 닫기
        if (isModalVisible && this.elements.debugModal.getAttribute('data-content') === 'debug') {
            this.closeDebugModal();
            return;
        }

        // 디버그 오버레이가 이미 열려있으면 닫기
        if (isOverlayVisible && currentContent === 'debug') {
            this.callbacks.closeAndResetState();
            return;
        }

        // 화면 크기와 패널 상태에 따라 모달 또는 오버레이로 표시
        const shouldShowModal = this.callbacks.shouldSwitchToModal();

        if (shouldShowModal) {
            this.showDebugModal();
        } else {
            this.showDebugOverlay();
        }
    },

    // 디버그 모달 표시
    showDebugModal() {
        const { debugModal, debugModalTitle, debugModalBody } = this.elements;

        debugModalTitle.textContent = '디버그';
        debugModalBody.innerHTML = this.generateDebugContent();

        debugModal.setAttribute('data-content', 'debug');
        debugModal.classList.remove('hidden');

        // 모달이 표시되면 전환 버튼 보이기
        if (this.callbacks.isContentModalVisible && !this.callbacks.isContentModalVisible()) {
            this.elements.switchDebugToOverlayBtn.classList.remove('hidden');
        }
    },

    // 디버그 오버레이 표시
    showDebugOverlay() {
        const { overlayPanel, contextOverlayPanel } = this.elements;

        // 컨텍스트 윈도우 오버레이 닫기
        if (contextOverlayPanel && !contextOverlayPanel.classList.contains('overlay-hidden')) {
            contextOverlayPanel.classList.add('overlay-hidden');
        }

        overlayPanel.innerHTML = this.generateDebugContent();
        overlayPanel.setAttribute('data-content', 'debug');
        overlayPanel.classList.remove('overlay-hidden');

        this.callbacks.updateResizerState();
    },

    // 디버그 콘텐츠 생성
    generateDebugContent() {
        const currentPage = window.PageManager ? window.PageManager.currentPageIndex : 0;
        const currentPageTitle = window.PageManager && window.PageManager.pages[currentPage]
            ? window.PageManager.pages[currentPage].title
            : '알 수 없음';

        if (this.logs.length === 0) {
            return `
                <div class="text-center py-8" style="color: var(--text-secondary);">
                    <h2 class="text-xl font-bold mb-4" style="color: var(--text-primary);">
                        디버그 로그 - ${currentPageTitle} (페이지 ${currentPage + 1})
                    </h2>
                    <p>아직 로그가 없습니다.</p>
                </div>
            `;
        }

        const pageLogs = this.logs.filter(log => log.page === currentPage);

        if (pageLogs.length === 0) {
            return `
                <div class="text-center py-8" style="color: var(--text-secondary);">
                    <h2 class="text-xl font-bold mb-4" style="color: var(--text-primary);">
                        디버그 로그 - ${currentPageTitle} (페이지 ${currentPage + 1})
                    </h2>
                    <p>이 페이지의 로그가 없습니다.</p>
                    <p class="text-xs mt-2">총 ${this.logs.length}개의 로그가 다른 페이지에 있습니다.</p>
                </div>
            `;
        }

        const logsHtml = pageLogs.map((log, idx) => {
            const time = new Date(log.timestamp).toLocaleTimeString('ko-KR');
            const isRequest = log.type === 'request';
            const isError = log.type === 'error';

            let typeIcon = '📥';
            let typeText = '응답';
            let typeColor = 'var(--text-primary)';

            if (isRequest) {
                typeIcon = '📤';
                typeText = '요청';
                typeColor = 'var(--text-accent)';
            } else if (isError) {
                typeIcon = '⚠️';
                typeText = '에러';
                typeColor = '#ef4444';
            }

            // JSON을 보기 좋게 포맷팅
            const formattedData = JSON.stringify(log.data, null, 2)
                .replace(/\\n/g, '\n')  // 줄바꿈 문자 복원
                .replace(/\\t/g, '\t'); // 탭 문자 복원

            return `
                <div class="mb-4 p-4 rounded-lg" style="background-color: var(--bg-button);">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-semibold" style="color: ${typeColor};">
                            ${typeIcon} ${typeText}
                        </span>
                        <span class="text-xs" style="color: var(--text-secondary);">${time}</span>
                    </div>
                    <pre class="text-xs overflow-x-auto whitespace-pre-wrap font-mono p-2 rounded" style="background-color: var(--bg-panel); color: var(--text-primary); white-space: pre-wrap; word-break: break-word;">${this.escapeHtml(formattedData)}</pre>
                </div>
            `;
        }).join('');

        return `
            <div class="space-y-4">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold" style="color: var(--text-primary);">
                        디버그 로그 - ${currentPageTitle}
                    </h2>
                    <span class="text-sm" style="color: var(--text-secondary);">
                        페이지 ${currentPage + 1} / ${window.PageManager.pages.length}
                    </span>
                </div>
                <div class="space-y-4 max-h-[70vh] overflow-y-auto">
                    ${logsHtml}
                </div>
            </div>
        `;
    },

    // 모달 닫기
    closeDebugModal() {
        this.elements.debugModal.classList.add('hidden');
        this.elements.switchDebugToOverlayBtn.classList.add('hidden');
    },

    // 오버레이로 전환
    switchToOverlay() {
        this.closeDebugModal();
        this.showDebugOverlay();
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 디버그 내용 새로고침
    refreshDebugContent() {
        const isModalVisible = !this.elements.debugModal.classList.contains('hidden');
        const isOverlayVisible = !this.elements.overlayPanel.classList.contains('overlay-hidden');
        const currentContent = this.elements.overlayPanel.getAttribute('data-content');

        if (isModalVisible && this.elements.debugModal.getAttribute('data-content') === 'debug') {
            this.elements.debugModalBody.innerHTML = this.generateDebugContent();
        }

        if (isOverlayVisible && currentContent === 'debug') {
            this.elements.overlayPanel.innerHTML = this.generateDebugContent();
        }
    }
};
