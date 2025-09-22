export class Store {
    constructor() {
        this.state = {
            game: { mode: 'setup', sceneArchive: [], currentSceneIndex: -1 },
            config: { apiKey: '', debugMode: false, genre: '', adventure: '' },
            ui: { isGenerating: false, activePanel: null },
            cache: { imageCache: new Map(), dadSnapshots: new Map() } // dadSnapshots will store DAD objects
        };
        this.listeners = new Set();
    }
    
    update(path, value) {
        // "game.currentSceneIndex" → this.state.game.currentSceneIndex = value
        const keys = path.split('.');
        let target = this.state;
        for (let i = 0; i < keys.length - 1; i++) {
            target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;
        this.notify(path, value);
    }
    
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    
    notify(path, value) {
        this.listeners.forEach(fn => fn(path, value, this.state));
    }
}