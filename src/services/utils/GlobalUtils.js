export async function delayExecution(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export function isFormChanged(initialFormData, currentFormData) {
    const hasChanged = JSON.stringify(initialFormData) !== JSON.stringify(currentFormData);
    return hasChanged
}