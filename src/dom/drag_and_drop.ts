export type DropEffect = typeof DataTransfer.prototype.dropEffect;
type DragEventType = "drag" | "dragend" | "dragenter" | "dragleave" | "dragover" | "dragstart" | "drop";

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

export function makeDropTargetExpecting(
    dropTargetElement: HTMLElement,
    expectedDropElement: HTMLElement,
    onDrop: () => void
) {
    const abortController = new AbortController();
    const expectedElementId = expectedDropElement.id;

    const enabledDropTargetClass = `drop-target-enabled-for-${expectedElementId}`;
    dropTargetElement.classList.add(enabledDropTargetClass);

    addEventListenerToTarget("dragenter", () => {
        dropTargetElement.classList.add("drop-target");
    });
    addEventListenerToTarget("dragover", (e) => {
        dropTargetElement.classList.add("drop-target");
        e.stopPropagation();
    });
    addEventListenerToTarget("dragleave", () => {
        dropTargetElement.classList.remove("drop-target");
    });
    addEventListenerToTarget("drop", (e) => {
        dropTargetElement.classList.remove("drop-target");

        onDrop();

        e.stopPropagation();
    });

    expectedDropElement.addEventListener("dragend", () => {
        endInteraction();
    }, { signal: abortController.signal });

    function addEventListenerToTarget(type: DragEventType, listener: (this: HTMLElement, ev: DragEvent) => any): void {
        dropTargetElement.addEventListener(
            type,
            function(event) {
                const sourceElementId = event.dataTransfer?.getData("text/plain");
                if (sourceElementId === expectedElementId) {
                    listener.bind(this)(event);
                    event.preventDefault();
                }
            },
            { signal: abortController.signal }
        );
    }

    function endInteraction() {
        dropTargetElement.classList.remove(enabledDropTargetClass);
        abortController.abort();
    }
}
