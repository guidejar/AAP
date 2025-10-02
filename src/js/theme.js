// 테마 관리 모듈
export const ThemeManager = {
    init() {
        const themeToggleButton = document.getElementById('theme-toggle-btn');
        themeToggleButton.addEventListener('click', () => {
            const currentTheme = localStorage.getItem('theme') || 'light';
            this.applyTheme(currentTheme === 'light' ? 'dark' : 'light');
        });
        this.applyTheme(localStorage.getItem('theme') || 'light');
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        document.getElementById('sun-icon').classList.toggle('hidden', theme === 'dark');
        document.getElementById('moon-icon').classList.toggle('hidden', theme !== 'dark');
    }
};
