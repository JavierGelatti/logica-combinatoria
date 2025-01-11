import {ExpressionView, HoleView} from "./expression_view.ts";
import {createElement} from "./createElement.ts";
import {Expression, ExpressionType} from "../core/expression.ts";
import {DropTarget} from "./dropTarget.ts";
import {animateWith} from "./animation.ts";

export class ExpressionEditor {
    private readonly _domElement: HTMLElement;
    private _editorPallete!: HTMLElement;
    private _editorCanvas!: HTMLElement;
    private _newExpressionDropTargetElement!: HTMLElement;
    private _editorCanvasExpressions: ExpressionView[] = [];

    constructor() {
        this._domElement = this._createDomElement();
    }

    domElement(): HTMLElement {
        return this._domElement;
    }

    private _createDomElement(): HTMLElement {
        return createElement("div", {className: "expression-editor"}, [
            this._editorPallete = createElement("div", {className: "pallete"}),
            this._editorCanvas = createElement("div", {className: "canvas"}, [
                this._newExpressionDropTargetElement = createElement("div", {className: "new-expression-drop-target"}),
            ]),
        ]);
    }

    addToPallete(expression: Expression) {
        if (!expression.isRootExpression()) throw new Error("Non-root expression added to the pallete");

        const expressionView = ExpressionView.forExpression(expression);
        expressionView.makeDraggable(
            grabbedExpressionView => this._palleteExpressionDropTargetsFor(grabbedExpressionView),
        );
        this._editorPallete.append(expressionView.domElement());
    }

    private _makeDraggable(expressionView: ExpressionView<Expression>) {
        expressionView.makeDraggable(
            grabbedExpressionView => this._canvasExpressionDropTargetsFor(grabbedExpressionView),
        );
    }

    private _palleteExpressionDropTargetsFor(grabbedExpressionView: ExpressionView): DropTarget[] {
        return [
            this._newExpressionDropTarget(),
            ...this._holesInCanvasDropTargetsFor(grabbedExpressionView),
        ];
    }

    private _holesInCanvasDropTargetsFor(grabbedExpressionView: ExpressionView<Expression<any>>) {
        const pickedUpExpressionType = grabbedExpressionView.expressionType();
        return this._canvasHolesOfType(pickedUpExpressionType).map(holeView => new DropTarget(
            holeView.domElement(),
            (droppedExpressionView) => this._fillHoleInCanvas(holeView, droppedExpressionView),
        ));
    }

    private _newExpressionDropTarget() {
        return new DropTarget(
            this._newExpressionDropTargetElement,
            (droppedExpressionView) => this.addNewExpressionToCanvas(droppedExpressionView.expression),
        );
    }

    private _fillHoleInCanvas(holeView: HoleView<any>, droppedExpressionView: ExpressionView) {
        const newExpressionView = holeView.fillWith(droppedExpressionView)!;
        this._makeDraggable(newExpressionView);
    }

    private addNewExpressionToCanvas(requestedExpressionToAdd: Expression) {
        const newExpression = requestedExpressionToAdd.copy();
        const newExpressionView = ExpressionView.forExpression(newExpression);

        this._makeDraggable(newExpressionView);
        this._editorCanvas.insertBefore(newExpressionView.domElement(), this._newExpressionDropTargetElement);
        animateWith(newExpressionView.domElement(), "just-added");
        this._editorCanvasExpressions.push(newExpressionView);
    }

    private _canvasHolesOfType(expressionType: ExpressionType): HoleView<any>[] {
        return this._editorCanvasExpressions
            .map(expressionView => expressionView.expression)
            .flatMap(expression => expression.allHolesOfType(expressionType))
            .map(hole => ExpressionView.forExpression(hole));
    }

    private _canvasExpressionDropTargetsFor(grabbedExpressionView: ExpressionView): DropTarget[] {
        return [
            this._deleteExpressionDropTarget(),
            ...this._holesInCanvasDropTargetsFor(grabbedExpressionView),
        ];
    }

    private _deleteExpressionDropTarget() {
        return new DropTarget(
            this._editorPallete,
            (droppedExpressionView) => {
                if (droppedExpressionView.isForRootExpression()) {
                    this.removeFromCanvas(droppedExpressionView);
                } else {
                    droppedExpressionView.detachFromParent();
                }
            },
        );
    }

    private removeFromCanvas(expressionView: ExpressionView) {
        if (!this._editorCanvasExpressions.includes(expressionView)) return;

        this._editorCanvasExpressions.splice(this._editorCanvasExpressions.indexOf(expressionView), 1);
        expressionView.domElement().remove();
    }
}