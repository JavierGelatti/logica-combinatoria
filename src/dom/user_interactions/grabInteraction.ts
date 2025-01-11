import {ExpressionEditor} from "../expressionEditor.ts";
import {ExpressionView} from "../expression_view.ts";
import {makeDraggable, makeDropTargetExpecting} from "../essentials/drag_and_drop.ts";
import {UserInteraction} from "./userInteraction.ts";
import {addCancelableListener} from "../essentials/addCancelableListener.ts";

export class GrabInteraction extends UserInteraction {
    private _grabDeactivators: (() => void)[] | undefined;
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
        this._grabDeactivators = [
            makeDraggable(domElement, {
                onDragStart: () => this.start(),
                onDrop: () => this.finish(),
                onDragCancel: () => this.cancel(),
            }),
            addCancelableListener(domElement, "click", event => {
                this.start();
                event.stopPropagation();
            })
        ];
    }

    protected _start(): void {
        this._activateDropTargets();
    }

    private _activateDropTargets() {
        this._dropTargetDeactivators = this.currentDropTargets(this.expressionView)
            .flatMap(dropTarget => {
                const dropDeactivator = dropTarget.activateOn(this.expressionView);
                const clickInsideDeactivator = addCancelableListener(
                    dropTarget.element,
                    "click",
                    event => {
                        dropTarget.onDrop(this.expressionView);
                        this.finish();
                        event.stopPropagation();
                    }
                );
                const clickOutsideDeactivator = addCancelableListener(
                    document.body,
                    "click",
                    event => {
                        this.cancel();
                        event.stopPropagation();
                    }
                );

                return [dropDeactivator, clickInsideDeactivator, clickOutsideDeactivator];
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
        this._dropTargetDeactivators = undefined;
    }

    unregister(): void {
        this._grabDeactivators
            ?.forEach(deactivateGrab => deactivateGrab());
        this._grabDeactivators = undefined;
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
