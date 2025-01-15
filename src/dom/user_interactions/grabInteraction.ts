import {ExpressionEditor} from "../expressionEditor.ts";
import {ExpressionView} from "../expression_view.ts";
import {makeDropTargetExpecting} from "../essentials/drag_and_drop.ts";
import {UserInteraction} from "./userInteraction.ts";

export class GrabInteraction extends UserInteraction {
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
            .map(dropTarget => makeDropTargetExpecting(
                dropTarget.element,
                this.expressionView.domElement(),
                {
                    onDrop: () => {
                        dropTarget.onDrop(this.expressionView);
                        this.finish();
                    },
                    onActivate: () => dropTarget.onActivate(),
                    onDeactivate: () => dropTarget.onDeactivate()
                },
            ));
    }

    protected _cancel() {
        this.abortGrab();
        this._releaseGrabbedExpression();
    }

    protected _finish() {
        this._releaseGrabbedExpression();
    }

    private _releaseGrabbedExpression() {
        this.expressionView.domElement().classList.remove("grabbed");
        this.expressionView.stopGrabInteraction(this);
        this._deactivateDropTargets();
    }

    private _deactivateDropTargets() {
        this._dropTargetDeactivators
            ?.forEach(deactivateDropTarget => deactivateDropTarget());
        this._dropTargetDeactivators = undefined;
    }
}

export class DropTarget {
    constructor(
        public readonly element: HTMLElement,
        public readonly onDrop: (droppedExpressionView: ExpressionView) => void,
        public readonly onActivate: () => void = () => {},
        public readonly onDeactivate: () => void = () => {},
    ) {}
}
