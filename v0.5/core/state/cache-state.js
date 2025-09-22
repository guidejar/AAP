export const cacheState = {
    imageCache: new Map(),
    dadSnapshots: new Map() // This map will store DAD objects, e.g., { characters: { id: { name, appearance, personality, status } }, items: { id: { name, description, properties } }, locations: { id: { name, description, environment } }, skills: { id: { name, description, level } } }
};