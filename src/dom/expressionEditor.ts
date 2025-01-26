import {ExpressionView, HoleView, IdentifierView} from "./expression_view.ts";
import {createElement} from "./essentials/createElement.ts";
import {Expression, ExpressionType} from "../core/expressions/expression.ts";
import {animateWith} from "./essentials/animation.ts";
import {DropTarget, GrabInteraction} from "./user_interactions/grabInteraction.ts";
import {UserInteraction} from "./user_interactions/userInteraction.ts";
import {ExistsElimination, FormalSystem, Proof, TermNaming} from "../core/formalSystem.ts";
import {promptIdentifier, promptIdentifiers} from "./prompt_identifier.ts";
import {lastElementOf} from "../core/essentials/lastElement.ts";
import {Identifier} from "../core/expressions/identifier.ts";

export class ExpressionEditor {
    private readonly _system: FormalSystem = new FormalSystem();
    private readonly _domElement: HTMLElement;
    private _systemElement!: HTMLElement;
    private _axiomsList!: HTMLOListElement;
    private _theoremsList!: HTMLOListElement;
    private _startProofButton!: HTMLButtonElement;
    private _newVariableButton!: HTMLButtonElement;
    private _endProofButton!: HTMLButtonElement;
    private _editorPallete!: HTMLElement;
    private _editorCanvas!: HTMLElement;
    private _newExpressionDropTargetElement!: HTMLElement;
    private _deleteExpressionDropTargetElement!: HTMLElement;
    private _currentInteraction: UserInteraction | undefined = undefined;
    private _currentProofTheoremsList: HTMLOListElement[] = [];

    constructor() {
        this._domElement = this._createDomElement();
        this._updateActionButtons();

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
        return createElement("main", {}, [
            createElement("div", { className: "scroll-container"}, [
                this._systemElement = createElement("div", {className: "logic-system"}, [
                    createElement("h2", { textContent: "Axiomas & Teoremas" }),
                    this._axiomsList = createElement("ol", {className: "axioms"}),
                    this._theoremsList = createElement("ol", {className: "theorems"}),
                    createElement("div", {className: "actions"}, [
                        this._startProofButton = createElement("button", {
                            textContent: "Nueva demostración",
                            onclick: () => this.startNestedProof()
                        }),
                        this._newVariableButton = createElement("button", {
                            onclick: () => this.addNewVariables()
                        }),
                        this._endProofButton = createElement("button", {
                            textContent: "Finalizar demostración",
                            onclick: () => this.endCurrentProof()
                        }),
                    ])
                ]),
            ]),
            createElement("details", {className: "expression-editor"}, [
                createElement("summary", {}, [
                    createElement("h2", { textContent: "Nueva expresión" }),
                ]),
                createElement("div", {className: "editor"}, [
                    this._editorPallete = createElement("div", {className: "pallete"}, [
                        this._deleteExpressionDropTargetElement = createElement("div", {className: "delete-expression-drop-target"}),
                        createElement("button", {
                            textContent: "Insertar variable",
                            onclick: () => this.insertIdentifierInCanvas()
                        })
                    ]),
                    this._editorCanvas = createElement("div", {className: "canvas"}, [
                        this._newExpressionDropTargetElement = createElement("div", {className: "new-expression-drop-target"}),
                    ]),
                ])
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
                this._elementWithExistsDropTargetFor(expression)
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
        this._editorPallete.append(this._elementFor(expression.copy()));
    }

    private _palleteExpressionDropTargetsFor(grabbedExpressionView: ExpressionView): DropTarget[] {
        return [
            this._newExpressionDropTarget(),
            ...this._holesInCanvasDropTargetsFor(grabbedExpressionView),
            ...this._bindersInAxiomsOrTheoremsDropTargetsFor(grabbedExpressionView)
        ];
    }

    private _holesInCanvasDropTargetsFor(grabbedExpressionView: ExpressionView) {
        const pickedUpExpressionType = grabbedExpressionView.expressionType();
        return this._canvasHolesOfType(pickedUpExpressionType).map(holeView => new DropTarget(
            holeView.domElement(),
            (droppedExpressionView) => this._fillHoleInCanvas(holeView, droppedExpressionView),
        ));
    }

    private _bindersInAxiomsOrTheoremsDropTargetsFor(grabbedExpressionView: ExpressionView): DropTarget[] {
        return [
            ...this._forallBindersDropTargets(grabbedExpressionView),
            ...this._existingExistentialBindersDropTargets(grabbedExpressionView),
            ...this._newExistentialBindersDropTargets(grabbedExpressionView)
        ];
    }

    private _forallBindersDropTargets(grabbedExpressionView: ExpressionView<Expression>): DropTarget[] {
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

    private _existingExistentialBindersDropTargets(grabbedExpressionView: ExpressionView<Expression>): DropTarget[] {
        const grabbedExpression = grabbedExpressionView.expression.copy();
        if (!(grabbedExpression instanceof Identifier)) return [];

        return this._system.existentialQuantifiersThatCanBeReplacedWith(grabbedExpression)
            .map(expression => ExpressionView.forExpression(expression))
            .map(existsView => {
                const binderElement: HTMLElement = existsView.domElement().querySelector("& > .full-binder")!;
                const variableViews = [...existsView.expression.allOccurrencesOfBoundVariable()]
                    .map(identifier => ExpressionView.forExpression(identifier));

                return new DropTarget(
                    binderElement,
                    () => this._addExistsTheorem(
                        this._system.eliminateExists(existsView.expression, grabbedExpression)
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

    private _newExistentialBindersDropTargets(grabbedExpressionView: ExpressionView): DropTarget[] {
        const grabbedExpression = grabbedExpressionView.expression.copy();
        if (!(grabbedExpression instanceof Identifier)) return [];

        return this._system.candidatesForExistentialQuantificationOf(grabbedExpression)
            .map(proposition => ExpressionView.forExpression(proposition))
            .map(propositionView => {
                const targetElement = propositionView.domElement()
                    .querySelector<HTMLElement>("& > .exists-drop-target");
                if (targetElement === null) return undefined;

                return new DropTarget(
                    targetElement,
                    () => this._addTheorem(
                        this._system.introduceExists(grabbedExpression, propositionView.expression)
                    ),
                    () => {},
                    () => {},
                    () => targetElement.replaceChildren(
                        "∃",
                        IdentifierView.createRawElementFor(grabbedExpression, false)
                    )
                );
            })
            .filter(dropTarget => dropTarget !== undefined);
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
        const newExpressionElement = this._elementFor(newExpression);

        this._editorCanvas.insertBefore(newExpressionElement, this._newExpressionDropTargetElement);
        animateWith(newExpressionElement, "just-added");
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
            ...this._bindersInAxiomsOrTheoremsDropTargetsFor(grabbedExpressionView)
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
        this._updateActionButtons();
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

    private _addTheorem(newProof: Proof, steps?: HTMLOListElement) {
        this._addTheoremWithView(
            newProof,
            this._elementWithExistsDropTargetFor(newProof.provenProposition),
            steps
        );
    }

    private _addExistsTheorem(newProof: ExistsElimination) {
        this._updateTheoremHeader();
        this._addTheoremWithView(
            newProof,
            createElement("div", {className: "new-binding"}, [
                "Sea ",
                this._elementFor(newProof.newBoundVariable),
                " tal que ",
                this._elementWithExistsDropTargetFor(newProof.provenProposition),
            ])
        );
    }

    private _addNamingTheorem(newProof: TermNaming) {
        this._updateTheoremHeader();
        this._addTheoremWithView(
            newProof,
            createElement("div", {className: "new-binding"}, [
                "Sea ",
                this._elementFor(newProof.provenProposition),
            ])
        );
    }

    private _addTheoremWithView(newProof: Proof, htmlElement: HTMLElement, steps?: HTMLOListElement) {
        const proofId = this._identifierOf(newProof.provenProposition);
        const proofListItem = createElement("li", {id: proofId}, [
            htmlElement,
            collectionOf([
                ...newProof.referencedPropositions()
                    .map(proposition => {
                        const propositionId = this._identifierOf(proposition);
                        return createElement("a", {
                            href: `#${propositionId}`,
                            textContent: propositionId,
                            onclick: () => animateWith(document.getElementById(propositionId)!, "highlight"),
                        });
                    }),
            ], {className: "proof-reference"}),
        ]);

        if (steps !== undefined) {
            const collapseProof = () => {
                steps.classList.toggle("hidden",
                    proofListItem.classList.toggle("collapsed")
                );
            };
            proofListItem.prepend(
                createElement("div", {
                    role: "button",
                    title: "Colapsar demostración",
                    className: "collapse-proof-marker",
                    onclick: collapseProof
                })
            );
            collapseProof();
            this._currentProofTheorems().append(proofListItem, steps);
        } else {
            this._currentProofTheorems().append(proofListItem);
        }

        this._updateActionButtons();
        htmlElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
        animateWith(htmlElement, "just-added");
    }

    private _currentProofTheorems() {
        return lastElementOf(this._currentProofTheoremsList) ?? this._theoremsList;
    }

    private _identifierOf(provenExpression: Expression) {
        const [type, ...indexes] = this._system.identifierOf(provenExpression)!;
        return type + indexes.join(".");
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

    private addNewVariables() {
        if (this._canNameCurrentExpression()) {
            this.nameExpression(this._selectedExpression()!);
        } else {
            this.addNewArbitraryVariables();
        }
    }

    private _canNameCurrentExpression() {
        const currentExpression = this._selectedExpression();
        return currentExpression !== undefined && this._system.canNameTerm(currentExpression);
    }

    private _selectedExpression() {
        return this._currentInteraction?.currentExpression();
    }

    private addNewArbitraryVariables(promptText = "Nombre de las variables", promptInitialValue = ""): void {
        const newBoundVariables = promptIdentifiers(promptText, promptInitialValue);
        if (newBoundVariables === undefined) return;

        const knownIdentifier = newBoundVariables.find(identifier => this._system.isKnownObject(identifier));
        if (knownIdentifier !== undefined) return this.addNewArbitraryVariables(
            `El nombre ${knownIdentifier.toString()} ya está ocupado`,
            newBoundVariables.map(identifier => identifier.toString()).join(", ")
        );

        this._updateViewToNewProofIfNoOngoingProof();
        this._system.newArbitraryVariables(...newBoundVariables);
        this._updateTheoremHeader();
    }

    private nameExpression(expressionToName: Expression, promptText = "Nombre para la expresión", promptInitialValue = ""): void {
        const identifier = promptIdentifier(promptText, promptInitialValue);
        if (identifier === undefined) return;

        if (this._system.isKnownObject(identifier))
            return this.nameExpression(expressionToName, "Ese nombre ya está ocupado", identifier.toString());

        this._currentInteraction?.finish();
        this._updateViewToNewProofIfNoOngoingProof();
        const newProof = this._system.nameTerm(identifier, expressionToName.copy());
        this._addNamingTheorem(newProof);
    }

    private _updateTheoremHeader() {
        this._currentTheoremHeader()!.replaceChildren(
            ...this._elementsForNewVariables(this._system.arbitraryObjectsInCurrentOngoingProof()),
        );
    }

    private _updateViewToNewProofIfNoOngoingProof() {
        if (!this._system.thereIsAnOngoingProof()) this.startNestedProof();
    }

    private _currentTheoremHeader() {
        return this._currentProofTheorems().querySelector<HTMLLIElement>("li.theorem-header");
    }

    private _elementsForNewVariables(newBoundVariables: Identifier[]): (Node | string)[] {
        if (newBoundVariables.length === 0) {
            return ["Nuevo contexto"];
        }
        if (newBoundVariables.length === 1) {
            return [
                "Sea ",
                this._elementFor(newBoundVariables[0]),
                " un pájaro cualquiera",
            ];
        } else {
            return [
                "Sean ",
                collectionOf(
                    newBoundVariables.map(variable => this._elementFor(variable))
                ),
                " pájaros cualquiera",
            ];
        }
    }

    private endCurrentProof() {
        const proof = this._system.finishCurrentProof();
        this._addTheorem(proof, this._currentProofTheoremsList.pop());
    }

    private insertIdentifierInCanvas() {
        const newIdentifier = promptIdentifier("Nombre de la variable");
        if (newIdentifier === undefined) return;
        this.addNewExpressionToCanvas(newIdentifier);
    }

    private startNestedProof() {
        this._system.startNewProof();

        const list = createElement("ol", {className: "theorem-steps"}, [
            createElement("li", {className: "theorem-header"})
        ]);

        this._currentProofTheorems().append(list);
        this._currentProofTheoremsList.push(list);
        this._updateActionButtons();
        this._updateTheoremHeader();
    }

    private _elementWithExistsDropTargetFor(provenProposition: Expression) {
        const element = this._elementFor(provenProposition);
        element.prepend(
            createElement("span", {className: "exists-drop-target"})
        );
        return element;
    }

    private _elementFor(expression: Expression) {
        return ExpressionView.forExpression(expression).domElement();
    }

    private _updateActionButtons() {
        this._endProofButton.classList.toggle("hidden", !this._system.theresAProofOngoing());
        this._endProofButton.disabled = !this._system.canFinishCurrentProof();

        if (this._canNameCurrentExpression()) {
            this._newVariableButton.textContent = "Nombrar expresión";
        } else {
            this._newVariableButton.textContent = "Nueva variable";
        }
    }
}

function collectionOf(elements: HTMLElement[], properties: Parameters<typeof createElement>[1] = {}) {
    const classNames = properties.classNames ?? [];
    return createElement("ol", {...properties, classNames: [...classNames, "collection"]},
        elements.map(element => createElement("li", {}, [element]))
    );
}