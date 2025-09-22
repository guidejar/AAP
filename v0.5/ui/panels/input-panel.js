export class InputPanel {
    constructor(gameController) {
        this.gameController = gameController;
        this.inputElement = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.sendButton) {
            this.sendButton.onclick = () => this.handleSubmit(this.inputElement.value);
        }
        // Add event listener for Enter key in the input field
        if (this.inputElement) {
            this.inputElement.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // Prevent new line
                    this.handleSubmit(this.inputElement.value);
                }
            });
        }
    }

    async handleSubmit(input) {
        if (input.trim() === '') return;

        // InputPanel은 gameController 인스턴스를 직접 받았지만,
        // 실제로는 main.js의 processTurn 함수를 호출해야 함
        if (window.processTurn) {
            await window.processTurn(input);
        } else {
            console.error('processTurn function not available');
        }

        this.inputElement.value = ''; // Clear input after sending
    }

    disable() {
        if (this.inputElement) this.inputElement.disabled = true;
        if (this.sendButton) this.sendButton.disabled = true;
    }

    enable() {
        if (this.inputElement) this.inputElement.disabled = false;
        if (this.sendButton) this.sendButton.disabled = false;
    }
}