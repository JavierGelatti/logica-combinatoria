import {ExpressionView, HoleView} from "./expression_view.ts";
import {createElement} from "./essentials/createElement.ts";
import {Expression, ExpressionType} from "../core/expressions/expression.ts";
import {animateWith} from "./essentials/animation.ts";
import {DropTarget, GrabInteraction} from "./user_interactions/grabInteraction.ts";
import {UserInteraction} from "./user_interactions/userInteraction.ts";
import {FormalSystem, Proof} from "../core/formalSystem.ts";
import {promptIdentifier} from "./prompt_identifier.ts";
import {lastElementOf} from "../core/essentials/lastElement.ts";

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
    private _currentProofTheoremsList: HTMLOListElement[] = [];

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
                createElement("div", {className: "actions"}, [
                    createElement("button", {
                        textContent: "New binding",
                        onclick: () => this.startForAllIntroduction()
                    })
                ])
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
            createElement("li", { id: this._identifierOf(expression) }, [
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
                    () => this._addTheorem(
                        this._system.eliminateForAll(forallView.expression, grabbedExpression)
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

    private _addTheorem(newProof: Proof) {
        const newTheorem = newProof.provenProposition;
        const proofId = this._identifierOf(newTheorem);
        this._currentProofTheorems().append(
            createElement("li", { id: proofId }, [
                ExpressionView.forExpression(newTheorem).domElement(),
                createElement("div", { className: "proof-reference" }, [
                    ...newProof.referencedPropositions()
                        .map(proposition => {
                            const propositionId = this._identifierOf(proposition);
                            return createElement("a", {
                                href: `#${propositionId}`,
                                textContent: propositionId,
                                onclick: () => animateWith(document.getElementById(propositionId)!, "highlight")
                            })
                        })
                ])
            ]),
        );
    }

    private _currentProofTheorems() {
        return lastElementOf(this._currentProofTheoremsList) ?? this._theoremsList;
    }

    private _identifierOf(provenExpression: Expression) {
        return this._system.identifierOf(provenExpression)!.join(".");
    }

    private _rewriteExpressionDropTargetsFor(grabbedExpressionView: ExpressionView) {
        const grabbedExpression = grabbedExpressionView.expression;

        return this._system.rewriteCandidatesMatching(grabbedExpression)
            .map(potentialTargetExpression => {
                const expressionView = ExpressionView.forExpression(potentialTargetExpression);
                return new DropTarget(
                    expressionView.domElement(),
                    () => this._addTheorem(
                        this._system.rewrite(grabbedExpression, potentialTargetExpression)
                    )
                );
            })
            .filter(result=> result !== undefined);
    }

    private startForAllIntroduction() {
        const newBoundVariable = promptIdentifier("Nombre de la variable");
        if (newBoundVariable === undefined) return;

        let list!: HTMLOListElement;
        createElement("div", {}, [
            list = createElement("ol", {}, [
                createElement("li", {}, [
                    "Sea ",
                    ExpressionView.forExpression(newBoundVariable).domElement()
                ])
            ])
        ]);
        this._currentProofTheorems().append(list);
        this._currentProofTheoremsList.push(list);

        this._system.startForAllIntroduction(newBoundVariable);
    }
}