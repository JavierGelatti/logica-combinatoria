import {addCancelableListener} from "./addCancelableListener.ts";

export function onClick(element: HTMLElement, listener: (event: MouseEvent) => void) {
    return addCancelableListener(
        element,
        "click",
        event => {
            listener(event);
            event.stopPropagation();
        },
    );
}