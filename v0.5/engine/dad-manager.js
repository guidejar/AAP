export class DADManager {
    createSnapshot(dadState) {
        // Deep copy the DAD state to create an immutable snapshot
        return JSON.parse(JSON.stringify(dadState));
    }

    mergeDadSnapshot(currentDad, newAssets) {
        const mergedDad = { ...currentDad };

        for (const type of ['characters', 'items', 'locations', 'skills']) {
            if (newAssets[type]) {
                mergedDad[type] = { ...mergedDad[type], ...newAssets[type] };
            }
        }
        return mergedDad;
    }
}