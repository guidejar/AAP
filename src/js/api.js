// LLM API 통신 모듈
import { ResponseFormat } from './response-format.js';

export const APIManager = {
    apiKey: '',
    selectedModel: 'gemini-2.5-flash-lite',
    apiEndpoint: '',
    conversationHistory: [],
    responseSchema: ResponseFormat, // JSON 응답 스키마
    contextManager: null, // ContextManager 참조

    init(contextManager) {
        // ContextManager 참조 저장
        this.contextManager = contextManager;

        // localStorage에서 API 키 불러오기 (있으면 덮어씀)
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) {
            this.apiKey = savedKey;
        }

        // localStorage에서 모델 선택 불러오기
        const savedModel = localStorage.getItem('gemini_model');
        if (savedModel) {
            this.selectedModel = savedModel;
        }

        // 엔드포인트 설정
        this.updateEndpoint();
    },

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
    },

    setModel(model) {
        this.selectedModel = model;
        localStorage.setItem('gemini_model', model);
        this.updateEndpoint();
    },

    updateEndpoint() {
        this.apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.selectedModel}:generateContent`;
    },

    async sendMessage(userMessage) {
        if (!this.apiKey) {
            throw new Error('API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.');
        }

        // 대화 기록에 사용자 메시지 추가
        this.conversationHistory.push({
            role: 'user',
            content: userMessage
        });

        try {
            // ContextManager에서 시스템 프롬프트 + 컨텐츠 분리
            let systemInstruction = '';
            let contents = [];

            if (this.contextManager) {
                const context = this.contextManager.injectCustomContext([], userMessage);
                systemInstruction = context.systemInstruction;
                contents = context.contents.map(item => ({
                    role: 'user',
                    parts: [{ text: item.content }]
                }));
            } else {
                // ContextManager가 없으면 기존 방식
                contents = this.conversationHistory.map(item => ({
                    role: item.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: item.content }]
                }));
            }

            // 요청 바디 구성
            const requestBody = { contents };

            // 시스템 프롬프트 추가
            if (systemInstruction) {
                requestBody.systemInstruction = {
                    parts: [{ text: systemInstruction }]
                };
            }

            // JSON 스키마 추가
            if (this.responseSchema) {
                requestBody.generationConfig = {
                    responseMimeType: "application/json",
                    responseSchema: this.responseSchema
                };
            }

            // 디버그 로그: 요청
            if (window.DebugManager) {
                window.DebugManager.logAPI('request', {
                    message: userMessage,
                    requestBody: requestBody
                });
            }

            const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API 오류: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || '응답을 받을 수 없습니다.';

            // 디버그 로그: 응답
            if (window.DebugManager) {
                window.DebugManager.logAPI('response', {
                    message: assistantMessage,
                    fullResponse: data
                });
                window.DebugManager.refreshDebugContent();
            }

            // 대화 기록에 AI 응답 추가
            this.conversationHistory.push({
                role: 'assistant',
                content: assistantMessage
            });

            return assistantMessage;

        } catch (error) {
            console.error('API 호출 오류:', error);

            // 디버그 로그: 에러
            if (window.DebugManager) {
                window.DebugManager.logAPI('error', {
                    message: error.message,
                    error: error
                });
            }

            throw error;
        }
    },

    clearHistory() {
        this.conversationHistory = [];
    },

    getHistory() {
        return this.conversationHistory;
    }
};
