export class StoryPanel {
    constructor(store) {
        this.store = store;
        this.storyElement = document.getElementById('story-text');
        this.choicesContainer = document.getElementById('choices-container');
    }

    renderScene(scene) {
        if (this.storyElement) {
            this.storyElement.textContent = scene.text || scene.story;
        }
        this.renderChoices(scene.choices || []);
    }

    renderChoices(choices) {
        if (!this.choicesContainer) return;
        this.choicesContainer.innerHTML = '';

        choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.textContent = choice.text;
            button.onclick = () => this.handleChoiceClick(choice, index);
            this.choicesContainer.appendChild(button);
        });
    }

    handleChoiceClick(choice, index) {
        // processTurn() 호출하여 선택지 처리
        console.log(`Choice selected: ${choice.text}`);
    }
}