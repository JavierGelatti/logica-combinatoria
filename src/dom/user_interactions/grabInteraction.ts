import {ExpressionEditor} from "../expressionEditor.ts";
import {ExpressionView} from "../expression_view.ts";
import {makeDraggable, makeDropTargetExpecting} from "../essentials/drag_and_drop.ts";
import {UserInteraction} from "./userInteraction.ts";
import {addCancelableListener} from "../essentials/addCancelableListener.ts";

export class GrabInteraction extends UserInteraction {
    private _unmakeDraggable: (() => void) | undefined;
    private _unmakeClickable: (() => void) | undefined;
    private _dropTargetDeactivators: (() => void)[] | undefined;

    constructor(
        editor: ExpressionEditor,
        private readonly expressionView: ExpressionView,
        private readonly currentDropTargets: { (grabbedExpressionView: ExpressionView): DropTarget[] },
    ) {
        super(editor);
    }

    register() {
        const domElement = this.expressionView.domElement();
        this._unmakeDraggable = makeDraggable(domElement, {
            onDragStart: () => this.start(),
            onDrop: () => this.finish(),
            onDragCancel: () => this.cancel(),
        });
        this._unmakeClickable = addCancelableListener(domElement, "click", () => this.start());
    }

    protected _start(): void {
        this._activateDropTargets();
    }

    private _activateDropTargets() {
        this._dropTargetDeactivators = this.currentDropTargets(this.expressionView)
            .map(dropTarget => {
                const dropDeactivator = dropTarget.activateOn(this.expressionView);
                const clickDeactivator = addCancelableListener(
                    dropTarget.element,
                    "click",
                    () => {
                        dropTarget.onDrop(this.expressionView);
                        this.finish();
                    }
                )

                return () => {
                    dropDeactivator();
                    clickDeactivator();
                };
            });
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
        this._unmakeClickable?.();
    }
}

export class DropTarget {
    constructor(
        public readonly element: HTMLElement,
        public readonly onDrop: (droppedExpressionView: ExpressionView) => void,
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
