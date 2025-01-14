export function addCancelableListener<K extends keyof HTMLElementEventMap>(
    domElement: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
): () => void;
export function addCancelableListener(
    domElement: HTMLElement,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
): () => void;
export function addCancelableListener(
    domElement: HTMLElement,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
): () => void {
    domElement.addEventListener(type, listener, options);

    return () => {
        domElement.removeEventListener(type, listener, options);
    };
}

