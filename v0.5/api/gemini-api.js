export async function callGeminiApi(url, options) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${response.status} - ${errorData.message || response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error in callGeminiApi:", error);
        throw error;
    }
}