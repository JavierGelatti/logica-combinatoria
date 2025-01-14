import {ExpressionEditor} from "../expressionEditor.ts";
import {ExpressionView} from "../expression_view.ts";
import {makeDropTargetExpecting} from "../essentials/drag_and_drop.ts";
import {UserInteraction} from "./userInteraction.ts";
import {onClick} from "../essentials/onClick.ts";

export class GrabInteraction extends UserInteraction {
    private _grabDeactivators: (() => void)[] | undefined;
    private _dropTargetDeactivators: (() => void)[] | undefined;

    constructor(
        editor: ExpressionEditor,
        private readonly expressionView: ExpressionView,
        private readonly abortGrab: () => void,
        private readonly currentDropTargets: (grabbedExpressionView: ExpressionView) => DropTarget[],
    ) {
        super(editor);
    }

    protected _start(): void {
        this.expressionView.startGrabInteraction(this);
        this._activateDropTargets();
    }

    private _activateDropTargets() {
        this._dropTargetDeactivators = this.currentDropTargets(this.expressionView)
            .flatMap(dropTarget => {
                const dropDeactivator = makeDropTargetExpecting(
                    dropTarget.element,
                    this.expressionView.domElement(),
                    {
                        onDrop: () => {
                            dropTarget.onDrop(this.expressionView);
                            this.finish();
                        },
                    },
                );
                const clickInsideDeactivator = onClick(
                    dropTarget.element,
                    () => {
                        this.expressionView.domElement().dispatchEvent(
                            new CustomEvent("dropclick", {bubbles: true})
                        );
                        dropTarget.onDrop(this.expressionView);
                        this.finish();
                    }
                );
                return [dropDeactivator, clickInsideDeactivator];
            });
    }

    protected _cancel() {
        this.abortGrab();
        this.expressionView.domElement().classList.remove("grabbed");
        this.expressionView.stopGrabInteraction(this);
        this._deactivateDropTargets();
    }

    protected _finish() {
        this.expressionView.domElement().classList.remove("grabbed");
        this.expressionView.stopGrabInteraction(this);
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
}
