import {ExpressionView, HoleView} from "./expression_view.ts";
import {createElement} from "./essentials/createElement.ts";
import {Expression, ExpressionType} from "../core/expression.ts";
import {animateWith} from "./essentials/animation.ts";
import {DropTarget, GrabInteraction} from "./user_interactions/grabInteraction.ts";
import {UserInteraction} from "./user_interactions/userInteraction.ts";
import {makeDraggableDelegator} from "./essentials/drag_and_drop.ts";
import {ForAll} from "../core/forAll.ts";

export class ExpressionEditor {
    private readonly _domElement: HTMLElement;
    private _axiomsList!: HTMLOListElement;
    private _theoremsList!: HTMLOListElement;
    private _editorPallete!: HTMLElement;
    private _editorCanvas!: HTMLElement;
    private _newExpressionDropTargetElement!: HTMLElement;
    private _deleteExpressionDropTargetElement!: HTMLElement;
    private _currentInteraction: UserInteraction | undefined = undefined;

    constructor() {
        this._domElement = this._createDomElement();

        this._setupDraggableExpressionsOn(this._editorPallete, (grabbedExpressionView: ExpressionView) => {
            return this._palleteExpressionDropTargetsFor(grabbedExpressionView);
        });

        this._setupDraggableExpressionsOn(this._editorCanvas, (grabbedExpressionView: ExpressionView) => {
            return this._canvasExpressionDropTargetsFor(grabbedExpressionView);
        });
    }

    private _setupDraggableExpressionsOn(parentElement: HTMLElement, currentDropTargets: (grabbedExpressionView: ExpressionView) => DropTarget[]) {
        makeDraggableDelegator<ExpressionView>(
            parentElement,
            potentialTarget => this.draggableExpressionViewFrom(potentialTarget),
            {
                onDragStart: (target, cancelGrab) => {
                    new GrabInteraction(
                        this,
                        target,
                        cancelGrab,
                        currentDropTargets,
                    ).start();
                },
                onDragCancel: target => target.currentGrabInteraction()!.cancel(),
                textOnDrop: target => target.expression.toString(),
            },
        );
    }

    private draggableExpressionViewFrom(target: HTMLElement): ExpressionView | undefined {
        const expressionView = ExpressionView.forDomElement(target);
        if (expressionView?.isDraggable) return expressionView;
        const parentElement = (expressionView?.domElement() ?? target).parentElement;
        if (parentElement === null) return undefined;
        return this.draggableExpressionViewFrom(parentElement);
    }

    domElement(): HTMLElement {
        return this._domElement;
    }

    private _createDomElement(): HTMLElement {
        return createElement("div", {}, [
            createElement("div", {className: "logic-system"}, [
                this._axiomsList = createElement("ol", {className: "axioms"}),
                this._theoremsList = createElement("ol", {className: "theorems"}),
            ]),
            createElement("div", {className: "expression-editor"}, [
                this._editorPallete = createElement("div", {className: "pallete"}, [
                    this._deleteExpressionDropTargetElement = createElement("div", {className: "delete-expression-drop-target"})
                ]),
                this._editorCanvas = createElement("div", {className: "canvas"}, [
                    this._newExpressionDropTargetElement = createElement("div", {className: "new-expression-drop-target"}),
                ]),
            ])
        ]);
    }

    addAxiom(expression: Expression) {
        if (!expression.isRootExpression()) throw new Error("Non-root expression added as axiom");

        const expressionView = ExpressionView.forExpression(expression);
        this._axiomsList.append(
            createElement("li", {}, [
                expressionView.domElement()
            ])
        );
    }

    addToPallete(expression: Expression) {
        if (!expression.isRootExpression()) throw new Error("Non-root expression added to the pallete");

        const expressionView = ExpressionView.forExpression(expression);
        this._editorPallete.append(expressionView.domElement());
    }

    private _palleteExpressionDropTargetsFor(grabbedExpressionView: ExpressionView): DropTarget[] {
        return [
            this._newExpressionDropTarget(),
            ...this._holesInCanvasDropTargetsFor(grabbedExpressionView),
            ...this._forallBindersInAxiomsOrTheoremsDropTargetsFor(grabbedExpressionView)
        ];
    }

    private _holesInCanvasDropTargetsFor(grabbedExpressionView: ExpressionView) {
        const pickedUpExpressionType = grabbedExpressionView.expressionType();
        return this._canvasHolesOfType(pickedUpExpressionType).map(holeView => new DropTarget(
            holeView.domElement(),
            (droppedExpressionView) => this._fillHoleInCanvas(holeView, droppedExpressionView),
        ));
    }

    private _forallBindersInAxiomsOrTheoremsDropTargetsFor(grabbedExpressionView: ExpressionView): DropTarget[] {
        if (!grabbedExpressionView.isValue()) return [];

        return [...this._axiomExpressions(), ...this._theoremExpressions()]
            .flatMap(expressionView => expressionView.expression.allSubExpressions())
            .filter(expression => expression instanceof ForAll)
            .map(expression => ExpressionView.forExpression(expression))
            .map(forallView => {
                const binderElement: HTMLElement = forallView.domElement().querySelector(".full-binder")!;
                const variableViews = [...forallView.expression.boundVariable.allOccurrences()]
                    .map(identifier => ExpressionView.forExpression(identifier));

                return new DropTarget(
                    binderElement,
                    (droppedExpressionView) => this._applyForallTo(forallView, droppedExpressionView),
                    () => {
                        variableViews.forEach(view => view.domElement().classList.add("highlighted"))
                    },
                    () => {
                        variableViews.forEach(view => view.domElement().classList.remove("highlighted"))
                    }
                );
            });
    }

    private _newExpressionDropTarget() {
        return new DropTarget(
            this._newExpressionDropTargetElement,
            (droppedExpressionView) => this.addNewExpressionToCanvas(droppedExpressionView.expression),
        );
    }

    private _fillHoleInCanvas(holeView: HoleView<any>, droppedExpressionView: ExpressionView) {
        holeView.fillWith(droppedExpressionView);
    }

    private _editorCanvasExpressions(): ExpressionView[] {
        return [...this._editorCanvas.children]
            .filter(element => element instanceof HTMLElement)
            .map(element => ExpressionView.forDomElement(element))
            .filter(expressionView => expressionView !== undefined);
    }

    private _axiomExpressions(): ExpressionView[] {
        return [...this._axiomsList.querySelectorAll("& > li > *")]
            .filter(element => element instanceof HTMLElement)
            .map(element => ExpressionView.forDomElement(element))
            .filter(expressionView => expressionView !== undefined);
    }

    private _theoremExpressions(): ExpressionView[] {
        return [...this._theoremsList.querySelectorAll("& > li > *")]
            .filter(element => element instanceof HTMLElement)
            .map(element => ExpressionView.forDomElement(element))
            .filter(expressionView => expressionView !== undefined);
    }

    private addNewExpressionToCanvas(requestedExpressionToAdd: Expression) {
        const newExpression = requestedExpressionToAdd.copy();
        const newExpressionView = ExpressionView.forExpression(newExpression);

        this._editorCanvas.insertBefore(newExpressionView.domElement(), this._newExpressionDropTargetElement);
        animateWith(newExpressionView.domElement(), "just-added");
    }

    private _canvasHolesOfType(expressionType: ExpressionType): HoleView<any>[] {
        return this._editorCanvasExpressions()
            .map(expressionView => expressionView.expression)
            .flatMap(expression => expression.allHolesOfType(expressionType))
            .map(hole => ExpressionView.forExpression(hole));
    }

    private _canvasExpressionDropTargetsFor(grabbedExpressionView: ExpressionView): DropTarget[] {
        return [
            this._deleteExpressionDropTarget(),
            ...this._holesInCanvasDropTargetsFor(grabbedExpressionView),
            ...this._forallBindersInAxiomsOrTheoremsDropTargetsFor(grabbedExpressionView)
        ];
    }

    private _deleteExpressionDropTarget() {
        return new DropTarget(
            this._deleteExpressionDropTargetElement,
            (droppedExpressionView) => {
                if (droppedExpressionView.isForRootExpression()) {
                    droppedExpressionView.domElement().remove();
                } else {
                    droppedExpressionView.detachFromParent();
                }
            },
        );
    }

    startedInteraction(newInteraction: UserInteraction) {
        if (this._currentInteraction !== undefined) {
            this._currentInteraction.cancel();
        }

        this._currentInteraction = newInteraction;
    }

    completedInteraction(interaction: UserInteraction) {
        if (this._currentInteraction !== interaction) {
            throw new Error("Completed an interaction that was not current");
        }

        this._currentInteraction = undefined;
    }

    cancelledInteraction(interaction: UserInteraction) {
        if (this._currentInteraction !== interaction) {
            throw new Error("Cancelled an interaction that was not current");
        }

        this._currentInteraction = undefined;
    }

    private _applyForallTo(forallView: ExpressionView<ForAll>, droppedExpressionView: ExpressionView<Expression>) {
        if (!droppedExpressionView.isValue()) throw new Error("Cannot apply forall to non-value");

        const forallExpression = forallView.expression;
        const resultingExpression = forallExpression.applyTo(droppedExpressionView.expression);
        const newTheorem = forallExpression.rootExpression().replace(forallExpression, resultingExpression);
        this._theoremsList.append(
            createElement("li", {}, [
                ExpressionView.forExpression(newTheorem).domElement()
            ])
        );
    }
}