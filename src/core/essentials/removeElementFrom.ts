export function removeElementFrom<E>(elementToRemove: E, anArray: E[]): void {
    const elementIndex = anArray.indexOf(elementToRemove);
    if (elementIndex < 0) return;

    anArray.splice(elementIndex, 1);
}