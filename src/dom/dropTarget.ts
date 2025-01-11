import {ExpressionView} from "./expression_view.ts";
import {makeDropTargetExpecting} from "./drag_and_drop.ts";

export class DropTarget {
    constructor(
        private element: HTMLElement,
        private onDrop: (droppedExpressionView: ExpressionView) => void,
    ) {}

    activateOn(grabbedExpressionView: ExpressionView) {
        makeDropTargetExpecting(
            this.element,
            grabbedExpressionView.domElement(),
            () => this.onDrop(grabbedExpressionView),
        );
    }
}
