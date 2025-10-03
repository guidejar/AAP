// 채팅 UI 관리 모듈
export const ChatManager = {
    init(elements, api) {
        this.elements = elements;
        this.api = api;

        const { sendBtn, autoHeightTextarea, textDisplayArea } = elements;

        // 전송 버튼 클릭 이벤트
        sendBtn.addEventListener('click', () => this.handleSendMessage());

        // Enter 키 이벤트 (Shift+Enter는 줄바꿈, Enter만 누르면 전송)
        autoHeightTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
    },

    async handleSendMessage() {
        const { autoHeightTextarea, textDisplayArea, sendBtn } = this.elements;
        const message = autoHeightTextarea.value.trim();

        if (!message) return;

        // 사용자 메시지 표시
        this.addMessage('user', message);

        // 입력창 비활성화 및 로딩 표시
        this.showInputLoading();

        try {
            // API 호출
            const response = await this.api.sendMessage(message);

            // 로딩 해제
            this.hideInputLoading();

            // AI 응답 표시
            this.addMessage('assistant', response);

            // 스크롤을 최하단으로
            this.scrollToBottom();

            // PageManager가 있으면 새 페이지 생성
            if (window.PageManager && typeof window.PageManager.createPageFromResponse === 'function') {
                window.PageManager.createPageFromResponse(response);
            }

        } catch (error) {
            // 로딩 해제
            this.hideInputLoading();

            // 에러 메시지 표시
            this.addMessage('error', error.message);
        }
    },

    addMessage(role, content) {
        const { textDisplayArea } = this.elements;

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message-item', 'animate-fadeIn');

        if (role === 'user') {
            messageDiv.innerHTML = `
                <div class="flex justify-end mb-2">
                    <div class="max-w-[80%] rounded-lg p-4" style="background-color: var(--text-accent); color: white;">
                        <p class="whitespace-pre-wrap">${this.escapeHtml(content)}</p>
                    </div>
                </div>
            `;
        } else if (role === 'assistant') {
            // JSON인지 확인하고 파싱 시도
            let displayContent = content;
            let isJson = false;

            try {
                const parsed = JSON.parse(content);
                displayContent = JSON.stringify(parsed, null, 2);
                isJson = true;
            } catch (e) {
                // JSON이 아니면 그냥 텍스트로 표시
                displayContent = content;
            }

            messageDiv.innerHTML = `
                <div class="flex justify-start mb-2">
                    <div class="max-w-[80%] rounded-lg p-4" style="background-color: var(--bg-button); color: var(--text-primary);">
                        ${isJson ?
                            `<pre class="whitespace-pre-wrap font-mono text-sm overflow-x-auto">${this.escapeHtml(displayContent)}</pre>` :
                            `<p class="whitespace-pre-wrap">${this.escapeHtml(displayContent)}</p>`
                        }
                    </div>
                </div>
            `;
        } else if (role === 'error') {
            messageDiv.innerHTML = `
                <div class="flex justify-center mb-2">
                    <div class="max-w-[80%] rounded-lg p-4 border-2" style="background-color: var(--bg-modal); border-color: #ef4444; color: #ef4444;">
                        <p class="whitespace-pre-wrap">⚠️ ${this.escapeHtml(content)}</p>
                    </div>
                </div>
            `;
        }

        textDisplayArea.appendChild(messageDiv);
        this.scrollToBottom();
    },

    showInputLoading() {
        const { autoHeightTextarea, sendBtn } = this.elements;

        // 입력창과 전송 버튼 비활성화
        autoHeightTextarea.disabled = true;
        sendBtn.disabled = true;

        // 입력창 초기화 및 로딩 표시
        autoHeightTextarea.value = '응답 생성 중...';
        autoHeightTextarea.style.height = 'auto';
        autoHeightTextarea.style.opacity = '0.6';
        autoHeightTextarea.style.fontStyle = 'italic';
        autoHeightTextarea.style.color = 'var(--text-secondary)';

        // 전송 버튼 스타일 변경
        sendBtn.style.opacity = '0.5';
        sendBtn.style.cursor = 'not-allowed';
    },

    hideInputLoading() {
        const { autoHeightTextarea, sendBtn } = this.elements;

        // 입력창과 전송 버튼 활성화
        autoHeightTextarea.disabled = false;
        sendBtn.disabled = false;

        // 입력창 초기화 및 스타일 복원
        autoHeightTextarea.value = '';
        autoHeightTextarea.style.height = 'auto';
        autoHeightTextarea.style.opacity = '1';
        autoHeightTextarea.style.fontStyle = 'normal';
        autoHeightTextarea.style.color = '';

        // 전송 버튼 스타일 복원
        sendBtn.style.opacity = '1';
        sendBtn.style.cursor = 'pointer';

        // 포커스
        autoHeightTextarea.focus();
    },

    scrollToBottom() {
        const contentArea = this.elements.textDisplayArea.parentElement;
        contentArea.scrollTop = contentArea.scrollHeight;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    clearChat() {
        const { textDisplayArea } = this.elements;
        textDisplayArea.innerHTML = '';
        this.api.clearHistory();
    }
};
