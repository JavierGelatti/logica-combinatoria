import {isUUID, randomUUID} from "./uuid.ts";

export type DropEffect = typeof DataTransfer.prototype.dropEffect;
type DragEventType = "drag" | "dragend" | "dragenter" | "dragleave" | "dragover" | "dragstart" | "drop";
type DragEventWithDataTransfer = DragEvent & { readonly dataTransfer: DataTransfer };

export type DraggableConfiguration = {
    onDragStart?: () => void,
    onDrop?: () => void,
    onDragCancel?: () => void,
    dropEffect?: DropEffect,
};

export function makeDraggable(
    element: HTMLElement,
    configuration: DraggableConfiguration
): () => void {
    const { onDragStart, onDrop, onDragCancel, dropEffect } =
        Object.assign({ dropEffect: "copy" }, configuration);

    const abortController = new AbortController();

    element.id = element.id ?? randomUUID();
    element.setAttribute("draggable", "true");
    addEventListenerToElement("dragstart", (e) => {
        // See comment [657fabfb-7fbe-46ab-805e-cc1a74517ff4]
        e.dataTransfer.setData(element.id, "");
        e.dataTransfer.setData("text/plain", element.id);

        e.dataTransfer.dropEffect = dropEffect;
        onDragStart?.();
        e.stopPropagation();
    });
    addEventListenerToElement("dragend", (e) => {
        if (e.dataTransfer && e.dataTransfer.dropEffect !== "none") {
            onDrop?.();
        } else {
            onDragCancel?.();
        }

        e.stopPropagation();
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

                if (isForExpectedTarget(event.dataTransfer)) {
                    listener.bind(this)(event);
                    event.preventDefault();
                }
            },
            { signal: abortController.signal }
        );
    }

    function isForExpectedTarget(dataTransfer: DataTransfer) {
        if (dataTransfer.types[0] === expectedElementId) return true;

        // [657fabfb-7fbe-46ab-805e-cc1a74517ff4]
        // The verification is weird because some browsers (e.g. Chrome) only allow to access the data of the
        // dataTransfer object on _drop_. For those cases, we store the data as the _type_, so we can access it
        // before the drop. Other browsers (e.g. Chrome for Android) do not like a custom type: they only support, for
        // instance, text/plain.
        // As we want the drag & drop feature to work on the worst case, we skip the check and allow the event if we
        // can't get any information about its source.
        const sourceElementIdFromType = dataTransfer.types.find(type => isUUID(type));
        const sourceElementIdFromData = dataTransfer.getData("text/plain");

        const didNotGetAnyInfo = sourceElementIdFromType === undefined && sourceElementIdFromData === "";
        if (didNotGetAnyInfo) return true;

        return sourceElementIdFromType === expectedElementId || sourceElementIdFromData === expectedElementId;
    }

    function endInteraction() {
        dropTargetElement.classList.remove(enabledDropTargetClass);
        abortController.abort();
    }
}

function hasDataTransfer(event: DragEvent): event is DragEventWithDataTransfer {
    return event.dataTransfer !== null;
}
