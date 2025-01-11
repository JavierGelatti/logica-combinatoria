export function addCancelableListener<K extends keyof HTMLElementEventMap>(
    domElement: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
) {
    domElement.addEventListener(type, listener, options);

    return () => {
        domElement.removeEventListener(type, listener, options);
    };
}

