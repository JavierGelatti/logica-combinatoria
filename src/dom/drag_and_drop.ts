export type DropEffect = typeof DataTransfer.prototype.dropEffect;

export function makeDraggable(element: HTMLElement, onDrop: () => void = () => {}, dropEffect: DropEffect = "copy") {
    element.id = crypto.randomUUID();
    element.setAttribute("draggable", "true");
    element.addEventListener("dragstart", (e) => {
        if (e.dataTransfer !== null) {
            e.dataTransfer.setData("text/plain", element.id);
            e.dataTransfer.dropEffect = dropEffect;
            e.stopPropagation();
        }
    });
    element.addEventListener("dragend", (e) => {
        if (e.dataTransfer && e.dataTransfer.dropEffect !== "none") {
            onDrop();
        }

        e.stopPropagation();
    });
}

export function makeDropTarget(element: HTMLElement, onDrop: (droppedElement: HTMLElement) => void) {
    element.addEventListener("dragenter", (e) => {
        element.classList.add("drop-target");
        e.preventDefault();
    });
    element.addEventListener("dragover", (e) => {
        e.stopPropagation();
        e.preventDefault();
    });
    element.addEventListener("dragleave", (e) => {
        element.classList.remove("drop-target");
        e.preventDefault();
    });
    element.addEventListener("drop", (e) => {
        element.classList.remove("drop-target");
        const sourceElementId = e.dataTransfer!.getData("text/plain");
        const sourceElement = document.getElementById(sourceElementId)!;

        onDrop(sourceElement);

        e.stopPropagation();
        e.preventDefault();
    });
}