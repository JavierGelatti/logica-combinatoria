import {ExpressionEditor} from "../expressionEditor.ts";
import {ExpressionView} from "../expression_view.ts";
import {makeDraggable, makeDropTargetExpecting} from "../essentials/drag_and_drop.ts";
import {UserInteraction} from "./userInteraction.ts";

export class GrabInteraction extends UserInteraction {
    private _unmakeDraggable: (() => void) | undefined;
    private _dropTargetDeactivators: (() => void)[] | undefined;

    constructor(
        editor: ExpressionEditor,
        private readonly expressionView: ExpressionView,
        private readonly currentDropTargets: { (grabbedExpressionView: ExpressionView): DropTarget[] },
    ) {
        super(editor);
    }

    register() {
        this._unmakeDraggable = makeDraggable(this.expressionView.domElement(), {
            onDragStart: () => this.start(),
            onDrop: () => this.finish(),
            onDragCancel: () => this.cancel(),
        });
    }

    protected _start(): void {
        this._activateDropTargets();
    }

    private _activateDropTargets() {
        this._dropTargetDeactivators = this.currentDropTargets(this.expressionView)
            .map(dropTarget => dropTarget.activateOn(this.expressionView));
    }

    protected _cancel() {
        this._deactivateDropTargets();
    }

    protected _finish() {
        this._deactivateDropTargets();
    }

    private _deactivateDropTargets() {
        this._dropTargetDeactivators
            ?.forEach(deactivateDropTarget => deactivateDropTarget());
    }

    unregister(): void {
        this._unmakeDraggable?.();
    }
}

export class DropTarget {
    constructor(
        private element: HTMLElement,
        private onDrop: (droppedExpressionView: ExpressionView) => void,
    ) {
    }

    activateOn(grabbedExpressionView: ExpressionView): () => void {
        return makeDropTargetExpecting(
            this.element,
            grabbedExpressionView.domElement(),
            {
                onDrop: () => this.onDrop(grabbedExpressionView),
            },
        );
    }
}
