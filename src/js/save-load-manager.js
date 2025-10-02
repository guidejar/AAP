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
            currentPageIndex: 0
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

        // 페이지 복원
        if (state.pages && window.PageManager) {
            window.PageManager.pages = state.pages.map(page => ({
                id: page.id,
                title: page.title,
                type: page.type,
                leftContent: page.leftContent,
                rightContent: page.rightContent,
                choices: page.choices || []
            }));

            // 현재 페이지 인덱스 복원
            const targetIndex = state.currentPageIndex || 0;
            window.PageManager.currentPageIndex = targetIndex;
            window.PageManager.renderPage(targetIndex);
        }

        // 대화 기록 복원
        if (state.conversationHistory && window.APIManager) {
            window.APIManager.conversationHistory = state.conversationHistory;

            // 1페이지(채팅)의 UI 업데이트
            if (window.ChatManager && this.elements.textDisplayArea) {
                this.elements.textDisplayArea.innerHTML = '';

                state.conversationHistory.forEach(item => {
                    window.ChatManager.addMessage(item.role, item.content);
                });
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
