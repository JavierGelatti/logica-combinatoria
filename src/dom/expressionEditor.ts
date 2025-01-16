import {ExpressionView, HoleView} from "./expression_view.ts";
import {createElement} from "./essentials/createElement.ts";
import {Expression, ExpressionType, Truth, Value} from "../core/expressions/expression.ts";
import {animateWith} from "./essentials/animation.ts";
import {DropTarget, GrabInteraction} from "./user_interactions/grabInteraction.ts";
import {UserInteraction} from "./user_interactions/userInteraction.ts";
import {Equality} from "../core/expressions/equality.ts";
import {FormalSystem} from "../core/formalSystem.ts";

export class ExpressionEditor {
    private readonly _system: FormalSystem = new FormalSystem();
    private readonly _domElement: HTMLElement;
    private _systemElement!: HTMLElement;
    private _axiomsList!: HTMLOListElement;
    private _theoremsList!: HTMLOListElement;
    private _editorPallete!: HTMLElement;
    private _editorCanvas!: HTMLElement;
    private _newExpressionDropTargetElement!: HTMLElement;
    private _deleteExpressionDropTargetElement!: HTMLElement;
    private _currentInteraction: UserInteraction | undefined = undefined;

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
        this._system.addAxiom(expression);

        this._axiomsList.append(
            createElement("li", {}, [
                ExpressionView.forExpression(expression).domElement()
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
        return this._system.universalQuantifiersThatCanBeAppliedTo(grabbedExpression)
            .map(expression => ExpressionView.forExpression(expression))
            .map(forallView => {
                const binderElement: HTMLElement = forallView.domElement().querySelector("& > .full-binder")!;
                const variableViews = [...forallView.expression.allOccurrencesOfBoundVariable()]
                    .map(identifier => ExpressionView.forExpression(identifier));

                return new DropTarget(
                    binderElement,
                    (droppedExpressionView) => this._addTheorem(
                        this._system.eliminateForAll(
                            forallView.expression,
                            droppedExpressionView.expression
                        )
                    ),
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
    private _addTheorem(newTheorem: Expression<Truth>) {
        this._theoremsList.append(
            createElement("li", {}, [
                ExpressionView.forExpression(newTheorem).domElement(),
            ]),
        );
    }

    private _rewriteExpressionDropTargetsFor(grabbedExpressionView: ExpressionView) {
        const grabbedExpression = grabbedExpressionView.expression;
        // FIXME: Acceso directo al parent
        const grabbedExpressionParent = grabbedExpression._parent;
        if (!(grabbedExpressionParent instanceof Equality)) return [];

        return [...this._axiomExpressions(), ...this._theoremExpressions()]
            .flatMap(expressionView => expressionView.expression.allSubExpressions())
            .map(expression => {
                if (!expression.isValue() || expression.rootExpression() === grabbedExpression.rootExpression()) return undefined;
                const unificationResult = grabbedExpression.unifyWith(expression);
                if (!unificationResult.isSuccessful()) return undefined;
                const rewriteResult = unificationResult.rewrite();
                if (!(rewriteResult instanceof Equality)) return undefined;

                const expressionView = ExpressionView.forExpression(expression);
                return new DropTarget(
                    expressionView.domElement(),
                    (_droppedExpressionView) => {
                        this._rewriteTo(
                            expression,
                            grabbedExpressionParent.left === grabbedExpression ? rewriteResult.right : rewriteResult.left
                        );
                    }
                );
            })
            .filter(result=> result !== undefined);
    }

    private _rewriteTo(currentExpression: Expression<Value>, newValue: Expression<Value>) {
        const newExpression = currentExpression.rootExpression().replace(currentExpression, newValue.copy());

        this._addTheorem(newExpression);
    }
}