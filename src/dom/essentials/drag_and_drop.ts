export type DropEffect = typeof DataTransfer.prototype.dropEffect;
type DragEventType = "drag" | "dragend" | "dragenter" | "dragleave" | "dragover" | "dragstart" | "drop";
type DragEventWithDataTransfer = DragEvent & { readonly dataTransfer: DataTransfer };

export type DraggableConfiguration = {
    onDragStart?: () => void,
    onDrop?: () => void,
    onDragCancel?: () => void,
    dropEffect?: DropEffect,
    textOnDrop?: () => string
};

export function makeDraggable(
    element: HTMLElement,
    configuration: DraggableConfiguration
): () => void {
    const { onDragStart, onDrop, onDragCancel, dropEffect, textOnDrop } =
        Object.assign({ dropEffect: "copy", textOnDrop: () => "" }, configuration);

    const abortController = new AbortController();

    element.setAttribute("draggable", "true");
    addEventListenerToElement("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", textOnDrop());
        e.dataTransfer.dropEffect = dropEffect;
        onDragStart?.();
    });
    addEventListenerToElement("dragend", (e) => {
        if (e.dataTransfer.dropEffect !== "none") {
            onDrop?.();
        } else {
            onDragCancel?.();
        }
    });

    return endInteraction;

    function addEventListenerToElement(
        type: DragEventType,
        listener: (this: HTMLElement, ev: DragEventWithDataTransfer) => any
    ): void {
        element.addEventListener(
            type,
            function(event) {
                if (!hasDataTransfer(event)) return;
                listener.bind(this)(event);
                event.stopPropagation();
            },
            { signal: abortController.signal }
        );
    }

    function endInteraction() {
        element.removeAttribute("draggable");
        abortController.abort();
    }
}

export type DropTargetConfiguration = {
    onDrop: () => void,
    dropEffect?: DropEffect,
};

export function makeDropTargetExpecting(
    dropTargetElement: HTMLElement,
    expectedDropElement: HTMLElement,
    configuration: DropTargetConfiguration
): () => void {
    const { onDrop, dropEffect } =
        Object.assign({ dropEffect: "copy" }, configuration);

    const abortController = new AbortController();
    const expectedElementId = expectedDropElement.id;

    const enabledDropTargetClass = `drop-target-enabled-for-${expectedElementId}`;
    dropTargetElement.classList.add(enabledDropTargetClass);

    addEventListenerToTarget("dragenter", e => {
        dropTargetElement.classList.add("drop-target");
        e.dataTransfer.dropEffect = dropEffect;
    });
    addEventListenerToTarget("dragover", e => {
        dropTargetElement.classList.add("drop-target");
        e.dataTransfer.dropEffect = dropEffect;
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

    return endInteraction;

    function addEventListenerToTarget(
        type: DragEventType,
        listener: (this: HTMLElement, ev: DragEventWithDataTransfer) => any
    ): void {
        dropTargetElement.addEventListener(
            type,
            function(event) {
                if (!hasDataTransfer(event)) return;
                listener.bind(this)(event);
                event.preventDefault();
            },
            { signal: abortController.signal }
        );
    }

    function endInteraction() {
        dropTargetElement.classList.remove(enabledDropTargetClass);
        abortController.abort();
    }
}

function hasDataTransfer(event: DragEvent): event is DragEventWithDataTransfer {
    return event.dataTransfer !== null;
}
