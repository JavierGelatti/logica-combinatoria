export type DropEffect = typeof DataTransfer.prototype.dropEffect;

export type DraggableConfiguration = {
    onDragStart?: () => void,
    onDrop?: () => void,
    onDragEnd?: () => void,
    dropEffect?: DropEffect,
};

export function makeDraggable(
    element: HTMLElement,
    configuration: DraggableConfiguration = {}
) {
    const { onDragStart, onDrop, onDragEnd, dropEffect } = Object.assign({ dropEffect: "copy" }, configuration);

    element.id = crypto.randomUUID();
    element.setAttribute("draggable", "true");
    element.addEventListener("dragstart", (e) => {
        if (e.dataTransfer !== null) {
            e.dataTransfer.setData("text/plain", element.id);
            e.dataTransfer.dropEffect = dropEffect;
            onDragStart?.();
            e.stopPropagation();
        }
    });
    element.addEventListener("dragend", (e) => {
        if (e.dataTransfer && e.dataTransfer.dropEffect !== "none") {
            onDrop?.();
        }

        onDragEnd?.();
        e.stopPropagation();
    });
}

export function makeDropTarget(element: HTMLElement, onDrop: (droppedElement: HTMLElement) => void) {
    const abortController = new AbortController();

    element.addEventListener("dragenter", (e) => {
        element.classList.add("drop-target");
        e.preventDefault();
    }, { signal: abortController.signal });
    element.addEventListener("dragover", (e) => {
        e.stopPropagation();
        e.preventDefault();
    }, { signal: abortController.signal });
    element.addEventListener("dragleave", (e) => {
        element.classList.remove("drop-target");
        e.preventDefault();
    }, { signal: abortController.signal });
    element.addEventListener("drop", (e) => {
        element.classList.remove("drop-target");
        const sourceElementId = e.dataTransfer!.getData("text/plain");
        const sourceElement = document.getElementById(sourceElementId)!;

        onDrop(sourceElement);

        e.stopPropagation();
        e.preventDefault();
    }, { signal: abortController.signal });

    return () => {
        abortController.abort();
    }
}