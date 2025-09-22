// 테마 관리 모듈 - 첫 번째 분리 모듈
export class ThemeManager {
    constructor() {
        this.themeToggleButton = null;
        this.sunIcon = null;
        this.moonIcon = null;
    }

    init() {
        this.themeToggleButton = document.getElementById('theme-toggle-btn');
        this.sunIcon = document.getElementById('sun-icon');
        this.moonIcon = document.getElementById('moon-icon');

        if (this.themeToggleButton) {
            this.themeToggleButton.addEventListener('click', () => this.toggleTheme());
        }

        // 초기 테마 적용
        this.applyTheme(localStorage.getItem('theme') || 'light');
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        if (this.sunIcon && this.moonIcon) {
            this.sunIcon.classList.toggle('hidden', theme === 'dark');
            this.moonIcon.classList.toggle('hidden', theme !== 'dark');
        }
    }

    toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    getCurrentTheme() {
        return localStorage.getItem('theme') || 'light';
    }
}