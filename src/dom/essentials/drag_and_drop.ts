export type DropEffect = typeof DataTransfer.prototype.dropEffect;
type DragEventType = "drag" | "dragend" | "dragenter" | "dragleave" | "dragover" | "dragstart" | "drop";
type DragEventWithDataTransfer = DragEvent & { readonly dataTransfer: DataTransfer };

export type DraggableDelegatorConfiguration<E> = {
    onDragStart?: (target: E, dragWasCancelled: () => void) => void,
    onDragCancel?: (target: E) => void,
    dropEffect?: DropEffect,
    textOnDrop?: (target: E) => string
};

export function makeDraggableDelegator<E extends { domElement(): HTMLElement }>(
    parentElement: HTMLElement,
    targetSelector: (potentialTarget: HTMLElement) => E | undefined,
    configuration: DraggableDelegatorConfiguration<E>
) {
    const { onDragStart, onDragCancel, dropEffect, textOnDrop } =
        Object.assign({ dropEffect: "copy", textOnDrop: (_target: E, _dragWasCancelled: () => void) => "" }, configuration);

    parentElement.addEventListener("dragstart", whenOnTarget((event, target, targetElement) => {
        if (!hasDataTransfer(event)) return;

        const grabbingAbortController = new AbortController();
        onDragStart?.(target, () => grabbingAbortController.abort());

        event.dataTransfer.setData("text/plain", textOnDrop(target));
        event.dataTransfer.dropEffect = dropEffect;

        targetElement.addEventListener("dragend", (event) => {
            if (event.dataTransfer?.dropEffect === "none") {
                onDragCancel?.(target);
            }
        }, {once: true, signal: grabbingAbortController.signal});
    }));

    parentElement.addEventListener("click", whenOnTarget((event, target, targetElement) => {
        const grabbingAbortController = new AbortController();
        onDragStart?.(target, () => grabbingAbortController.abort());

        targetElement.classList.add("grabbed");
        event.stopPropagation();

        document.body.addEventListener("click", () => {
            onDragCancel?.(target)
            grabbingAbortController.abort();
        }, {once: true, signal: grabbingAbortController.signal });

        targetElement.addEventListener("dropclick", () => {
            grabbingAbortController.abort();
        }, {once: true, signal: grabbingAbortController.signal });
    }));

    function whenOnTarget<Ev extends Event>(handler: (event: Ev, target: E, targetElement: HTMLElement) => void) {
        return (event: Ev) => {
            const target = targetOf(event);
            if (target === undefined) return;
            handler(event, target, target.domElement());
        }
    }

    function targetOf(event: Event): E | undefined {
        if (!(event.target instanceof HTMLElement)) return;

        return targetSelector(event.target);
    }
}

export type DropTargetConfiguration = {
    onDrop: () => void,
    onActivate?: () => void,
    onDeactivate?: () => void,
    dropEffect?: DropEffect,
};

export function makeDropTargetExpecting(
    dropTargetElement: HTMLElement,
    expectedDropElement: HTMLElement,
    configuration: DropTargetConfiguration
): () => void {
    const { onDrop, dropEffect, onActivate, onDeactivate } =
        Object.assign({ dropEffect: "copy", onActivate: () => {}, onDeactivate: () => {} }, configuration);

    const abortController = new AbortController();

    dropTargetElement.classList.add("enabled-drop-target");

    addEventListenerToTarget("dragenter", e => {
        const exitedElement = e.relatedTarget as Node;
        if (dropTargetElement.contains(exitedElement)) {
            // We were already dragging within dropTargetElement
            return;
        }
        e.dataTransfer.dropEffect = dropEffect;
        activateDropTarget();
    });
    addEventListenerToTarget("dragover", e => {
        e.dataTransfer.dropEffect = dropEffect;
        e.stopPropagation();
    });
    addEventListenerToTarget("dragleave", e => {
        const enteredElement = e.relatedTarget as Node;
        if (dropTargetElement.contains(enteredElement)) {
            // We are still dragging within dropTargetElement
            return;
        }

        deactivateDropTarget();
    });
    addEventListenerToTarget("drop", (e) => {
        deactivateDropTarget();

        onDrop();

        e.stopPropagation();
    });

    dropTargetElement.addEventListener("pointerenter", () => {
        activateDropTarget();
    }, { signal: abortController.signal });
    dropTargetElement.addEventListener("pointerleave", () => {
        deactivateDropTarget();
    }, { signal: abortController.signal });
    dropTargetElement.addEventListener("click", event => {
        deactivateDropTarget();
        expectedDropElement.dispatchEvent(new CustomEvent("dropclick", {bubbles: true}));

        onDrop();

        event.stopPropagation();
    }, { signal: abortController.signal, once: true });

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
        dropTargetElement.classList.remove("enabled-drop-target");
        abortController.abort();
    }

    function activateDropTarget() {
        dropTargetElement.classList.add("active-drop-target");
        onActivate();
    }

    function deactivateDropTarget() {
        dropTargetElement.classList.remove("active-drop-target");
        onDeactivate();
    }
}

function hasDataTransfer(event: DragEvent): event is DragEventWithDataTransfer {
    return event.dataTransfer !== null;
}
