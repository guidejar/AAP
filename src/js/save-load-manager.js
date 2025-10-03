// 세이브/로드 관리 모듈
export const SaveLoadManager = {
    elements: null,

    init(elements) {
        this.elements = elements;

        // 저장 버튼 이벤트
        if (elements.saveBtn) {
            elements.saveBtn.addEventListener('click', () => this.saveToFile());
        }

        // 불러오기 버튼 이벤트
        if (elements.loadBtn) {
            elements.loadBtn.addEventListener('click', () => this.loadFromFile());
        }
    },

    // 현재 상태를 JSON으로 직렬화
    serializeState() {
        const state = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            pages: [],
            conversationHistory: [],
            debugLogs: [],
            currentPageIndex: 0,
            contextWindow: [],
            database: null
        };

        // 페이지 데이터
        if (window.PageManager) {
            state.pages = window.PageManager.pages.map(page => ({
                id: page.id,
                title: page.title,
                type: page.type,
                leftContent: page.leftContent,
                rightContent: page.rightContent,
                choices: page.choices
            }));
            state.currentPageIndex = window.PageManager.currentPageIndex;
        }

        // 대화 기록
        if (window.APIManager) {
            state.conversationHistory = window.APIManager.conversationHistory;
        }

        // 디버그 로그
        if (window.DebugManager) {
            state.debugLogs = window.DebugManager.logs.map(log => ({
                timestamp: log.timestamp,
                type: log.type,
                data: log.data,
                page: log.page
            }));
        }

        // 컨텍스트 윈도우
        if (window.ContextManager) {
            state.contextWindow = window.ContextManager.contextWindow;
        }

        // 데이터베이스 상태 (current + snapshots + commitHistory)
        if (window.Database) {
            state.database = {
                current: JSON.parse(JSON.stringify(window.Database.current)),
                snapshots: JSON.parse(JSON.stringify(window.Database.snapshots)),
                commitHistory: JSON.parse(JSON.stringify(window.Database.commitHistory))
            };
        }

        return state;
    },

    // JSON을 파일로 저장
    saveToFile() {
        try {
            const state = this.serializeState();
            const json = JSON.stringify(state, null, 2);
            const blob = new Blob([json], { type: 'application/json' });

            // 파일명 생성 (날짜 기반)
            const now = new Date();
            const filename = `chat_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.json`;

            // 다운로드 링크 생성
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('저장 완료:', filename);
            this.showNotification('저장 완료!', 'success');
        } catch (error) {
            console.error('저장 오류:', error);
            this.showNotification('저장 실패: ' + error.message, 'error');
        }
    },

    // 파일에서 JSON 불러오기
    loadFromFile() {
        try {
            // 파일 입력 요소 생성
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json,.json';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    const text = await file.text();
                    const state = JSON.parse(text);

                    // 상태 복원
                    this.restoreState(state);

                    console.log('불러오기 완료:', file.name);
                    this.showNotification('불러오기 완료!', 'success');
                } catch (error) {
                    console.error('불러오기 오류:', error);
                    this.showNotification('불러오기 실패: ' + error.message, 'error');
                }
            };

            input.click();
        } catch (error) {
            console.error('파일 선택 오류:', error);
            this.showNotification('파일 선택 실패: ' + error.message, 'error');
        }
    },

    // JSON에서 상태 복원
    restoreState(state) {
        if (!state || typeof state !== 'object') {
            throw new Error('유효하지 않은 저장 파일입니다.');
        }

        // 버전 체크 (선택사항)
        if (state.version && state.version !== '1.0') {
            console.warn('다른 버전의 저장 파일입니다:', state.version);
        }

        // 모든 오버레이/모달 닫기 및 UI 초기화
        if (this.elements.overlayPanel) {
            this.elements.overlayPanel.classList.add('overlay-hidden');
        }
        if (this.elements.contextOverlayPanel) {
            this.elements.contextOverlayPanel.classList.add('overlay-hidden');
        }
        if (this.elements.contentModal) {
            this.elements.contentModal.classList.add('hidden');
        }
        if (this.elements.settingsModal) {
            this.elements.settingsModal.classList.add('hidden');
        }
        if (this.elements.debugModal) {
            this.elements.debugModal.classList.add('hidden');
        }

        // ContentManager 상태 초기화
        if (window.ContentManager) {
            window.ContentManager.pinState = 'unpinned';
            window.ContentManager.pinnedKey = null;
            window.ContentManager.currentOverlayKey = null;
            window.ContentManager.currentContentData = null;
            window.ContentManager.updateActiveIconState();
        }

        // 대화 기록 복원 (UI 업데이트 없이 데이터만)
        if (state.conversationHistory && window.APIManager) {
            window.APIManager.conversationHistory = state.conversationHistory;
        }

        // 페이지 복원
        if (state.pages && window.PageManager) {
            window.PageManager.pages = state.pages.map(page => ({
                id: page.id,
                title: page.title,
                type: page.type,
                leftContent: page.leftContent,
                rightContent: page.rightContent,
                choices: page.choices || [],
                design: page.design || null,
                dbCommit: page.dbCommit || null
            }));

            // 현재 페이지 인덱스 복원
            const targetIndex = state.currentPageIndex || 0;
            window.PageManager.currentPageIndex = targetIndex;

            // 페이지 렌더링 (채팅 페이지면 대화 기록도 함께 렌더링됨)
            if (targetIndex === 0 && window.ChatManager && this.elements.textDisplayArea) {
                // 채팅 페이지: 대화 기록 UI 복원
                this.elements.textDisplayArea.innerHTML = '';
                state.conversationHistory.forEach(item => {
                    window.ChatManager.addMessage(item.role, item.content);
                });
            } else {
                // 다른 페이지: 페이지 렌더링만
                window.PageManager.renderPage(targetIndex);
            }
        }

        // 디버그 로그 복원
        if (state.debugLogs && window.DebugManager) {
            window.DebugManager.logs = state.debugLogs.map(log => ({
                timestamp: log.timestamp,
                type: log.type,
                data: log.data,
                page: log.page,
                temporary: false
            }));
        }

        // 컨텍스트 윈도우 복원
        if (state.contextWindow && window.ContextManager) {
            window.ContextManager.contextWindow = state.contextWindow;
            console.log('컨텍스트 윈도우 복원 완료:', state.contextWindow.length, '턴');
        }

        // 데이터베이스 상태 복원
        if (state.database && window.Database) {
            // 구버전 호환 (database가 객체가 아니라 current만 있는 경우)
            if (state.database.current) {
                window.Database.current = JSON.parse(JSON.stringify(state.database.current));
                window.Database.snapshots = state.database.snapshots ? JSON.parse(JSON.stringify(state.database.snapshots)) : [];
                window.Database.commitHistory = state.database.commitHistory ? JSON.parse(JSON.stringify(state.database.commitHistory)) : [];
            } else {
                // 구버전 파일 (database가 current 그 자체)
                window.Database.current = JSON.parse(JSON.stringify(state.database));
                window.Database.snapshots = [];
                window.Database.commitHistory = [];
            }
            console.log('데이터베이스 상태 복원 완료 (snapshots:', window.Database.snapshots.length, ', commits:', window.Database.commitHistory.length, ')');
        }

        // 복원 후 Manager들 재초기화 (참조 동기화)
        if (window.DatabaseParser && window.Database) {
            window.DatabaseParser.init(window.Database);
            console.log('DatabaseParser 재초기화 완료');
        }

        if (window.APIManager && window.ContextManager) {
            window.APIManager.init(window.ContextManager);
            console.log('APIManager 재초기화 완료');
        }

        if (window.ChatManager && window.APIManager) {
            window.ChatManager.api = window.APIManager;
            console.log('ChatManager API 참조 업데이트 완료');
        }

        if (window.PageManager && window.ChatManager && window.APIManager) {
            window.PageManager.chatManager = window.ChatManager;
            window.PageManager.apiManager = window.APIManager;
            console.log('PageManager 참조 업데이트 완료');
        }
    },

    // 알림 표시 (간단한 토스트)
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg animate-fadeIn';

        const bgColor = type === 'success' ? '#10b981' :
                        type === 'error' ? '#ef4444' :
                        'var(--text-accent)';

        notification.style.backgroundColor = bgColor;
        notification.style.color = 'white';
        notification.textContent = message;

        document.body.appendChild(notification);

        // 3초 후 제거
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
};
