import {ExpressionView, HoleView} from "./expression_view.ts";
import {createElement} from "./essentials/createElement.ts";
import {Expression, ExpressionType, Value} from "../core/expressions/expression.ts";
import {animateWith} from "./essentials/animation.ts";
import {DropTarget, GrabInteraction} from "./user_interactions/grabInteraction.ts";
import {UserInteraction} from "./user_interactions/userInteraction.ts";
import {ForAll} from "../core/expressions/forAll.ts";
import {Identifier} from "../core/expressions/identifier.ts";
import {Equality} from "../core/expressions/equality.ts";

export class ExpressionEditor {
    private readonly _domElement: HTMLElement;
    private _systemElement!: HTMLElement;
    private _axiomsList!: HTMLOListElement;
    private _theoremsList!: HTMLOListElement;
    private _editorPallete!: HTMLElement;
    private _editorCanvas!: HTMLElement;
    private _newExpressionDropTargetElement!: HTMLElement;
    private _deleteExpressionDropTargetElement!: HTMLElement;
    private _currentInteraction: UserInteraction | undefined = undefined;
    private _wellKnownObjects: Identifier[] = [];

    constructor() {
        this._domElement = this._createDomElement();

        GrabInteraction.setupOn(this, this._editorPallete, (grabbedExpressionView: ExpressionView) => {
            return this._palleteExpressionDropTargetsFor(grabbedExpressionView);
        });
        GrabInteraction.setupOn(this, this._editorCanvas, (grabbedExpressionView: ExpressionView) => {
            return this._canvasExpressionDropTargetsFor(grabbedExpressionView);
        });
        GrabInteraction.setupOn(this, this._systemElement, (grabbedExpressionView: ExpressionView) => {
            return this._systemExpressionDropTargetsFor(grabbedExpressionView);
        });
    }

    private _createDomElement(): HTMLElement {
        return createElement("div", {}, [
            this._systemElement = createElement("div", {className: "logic-system"}, [
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

    domElement(): HTMLElement {
        return this._domElement;
    }

    addAxiom(expression: Expression) {
        if (!expression.isRootExpression()) throw new Error("Non-root expression added as axiom");

        [...expression.freeVariables()].forEach(freeVariable => {
            if (this._wellKnownObjects.some(o => o.equals(freeVariable))) return;

            this._wellKnownObjects.push(freeVariable);
        });

        const expressionView = ExpressionView.forExpression(expression);
        this._axiomsList.append(
            createElement("li", {}, [
                expressionView.domElement()
            ])
        );
    }

    private _systemExpressionDropTargetsFor(grabbedExpressionView: ExpressionView): DropTarget[] {
        return [
            ...this._palleteExpressionDropTargetsFor(grabbedExpressionView),
            ...this._rewriteExpressionDropTargetsFor(grabbedExpressionView),
        ];
    }

    addToPallete(expression: Expression) {
        const expressionView = ExpressionView.forExpression(expression.copy());
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
        const grabbedExpression = grabbedExpressionView.expression.copy();
        if (!grabbedExpression.isValue()) return [];
        if (!grabbedExpression.isComplete()) return [];

        return [...this._axiomExpressions(), ...this._theoremExpressions()]
            .flatMap(expressionView => expressionView.expression.allSubExpressions())
            .filter(expression => expression instanceof ForAll)
            .filter(forall => {
                return [...grabbedExpression.freeVariables()]
                    .every(freeVariable => {
                        return !forall.isFreeVariableInParent(freeVariable) || this._isWellKnownFreeVariable(freeVariable);
                    });
            })
            .map(expression => ExpressionView.forExpression(expression))
            .map(forallView => {
                const binderElement: HTMLElement = forallView.domElement().querySelector("& > .full-binder")!;
                const variableViews = [...forallView.expression.allOccurrencesOfBoundVariable()]
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

    private _isWellKnownFreeVariable(freeVariable: Identifier) {
        return this._wellKnownObjects.some(o => o.equals(freeVariable));
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
            this._newExpressionDropTarget(),
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

    private _rewriteExpressionDropTargetsFor(grabbedExpressionView: ExpressionView) {
        const grabbedExpression = grabbedExpressionView.expression;
        // FIXME: Acceso directo al parent
        const grabbedExpressionParent = grabbedExpression._parent;
        if (!(grabbedExpressionParent instanceof Equality)) return [];

        return [...this._axiomExpressions(), ...this._theoremExpressions()]
            .flatMap(expressionView => expressionView.expression.allSubExpressions())
            .filter(expression => expression.isValue())
            .filter(expression => {
                if (expression === grabbedExpression) return false;

                const unification = grabbedExpression.unifyWith(expression);
                return unification.isSuccessful() && unification.bindings.size === 0;
            })
            .map(expression => ExpressionView.forExpression(expression))
            .map(expressionView => {
                return new DropTarget(
                    expressionView.domElement(),
                    (_droppedExpressionView) => {
                        this._rewriteTo(expressionView, grabbedExpressionParent.left === grabbedExpression ? grabbedExpressionParent.right : grabbedExpressionParent.left);
                    }
                );
            });
    }

    private _rewriteTo(expressionView: ExpressionView<Expression<Value>>, newValue: Expression<Value>) {
        const currentExpression = expressionView.expression;
        debugger;
        const newExpression = currentExpression.rootExpression().replace(currentExpression, newValue.copy());

        // TODO: Agregar esto como nuevo teorema, en lugar de modificar en el lugar
        ExpressionView.forExpression(currentExpression.rootExpression())
            .domElement().replaceWith(ExpressionView.forExpression(newExpression).domElement());
    }
}