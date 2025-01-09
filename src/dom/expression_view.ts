import {Expression} from "../core/expression.ts";
import {Application} from "../core/application.ts";
import {ForAll} from "../core/forAll.ts";
import {Exists} from "../core/exists.ts";
import {Equality} from "../core/equality.ts";
import {Identifier} from "../core/identifier.ts";
import {createElement} from "./createElement.ts";
import {Hole} from "../core/hole.ts";

export abstract class ExpressionView<T extends Expression> {
    private static readonly modelKey = Symbol("model");

    static forDomElement(element: HTMLElement): ExpressionView<Expression> | undefined {
        // @ts-ignore
        return element[this.modelKey];
    }

    static forExpression(expression: Expression) {
        if (expression instanceof Identifier) {
            return new IdentifierView(expression);
        } else if (expression instanceof ForAll) {
            return new ForAllView(expression);
        } else if (expression instanceof Exists) {
            return new ExistsView(expression);
        } else if (expression instanceof Application) {
            return new ApplicationView(expression);
        } else if (expression instanceof Equality) {
            return new EqualityView(expression);
        } else if (expression instanceof Hole) {
            return new HoleView(expression);
        } else {
            throw new Error(`Tipo de expresión desconocida: ${expression}`)
        }
    }

    private _domElement?: HTMLElement;

    constructor(public readonly expression: T) {}

    domElement(): HTMLElement {
        if (this._domElement === undefined) {
            this._domElement = this._createDomElement();

            // @ts-ignore
            this._domElement[ExpressionView.modelKey] = this;

            if (this.expression.needsParenthesis()) {
                this._domElement.prepend(leftParenthesis());
                this._domElement.append(rightParenthesis());
            }
        }

        return this._domElement;
    }

    protected abstract _createDomElement(): HTMLElement
}

export class ApplicationView extends ExpressionView<Application> {
    protected _createDomElement(): HTMLElement {
        const elementForFunction = ApplicationView.forExpression(this.expression.functionBeingApplied).domElement();
        const elementForArgument = ApplicationView.forExpression(this.expression.argument).domElement();

        return createElement("span", {className: "application" }, [
            elementForFunction,
            elementForArgument
        ]);
    }
}

export class ForAllView extends ExpressionView<ForAll> {
    protected _createDomElement(): HTMLElement {
        return createElement("span", {className: "forall" }, [
            ...parenthesized(
                binder("∀"),
                ApplicationView.forExpression(this.expression.boundVariable).domElement()
            ),
            ApplicationView.forExpression(this.expression.body).domElement(),
        ]);
    }
}

export class ExistsView extends ExpressionView<Exists> {
    protected _createDomElement(): HTMLElement {
        return createElement("span", {className: "exists" }, [
            ...parenthesized(
                binder("∃"),
                ApplicationView.forExpression(this.expression.boundVariable).domElement()
            ),
            ApplicationView.forExpression(this.expression.body).domElement(),
        ]);
    }
}

export class EqualityView extends ExpressionView<Equality> {
    protected _createDomElement(): HTMLElement {
        const leftElement = ApplicationView.forExpression(this.expression.left).domElement();
        makeDraggable(leftElement);
        const rightElement = ApplicationView.forExpression(this.expression.right).domElement();
        makeDraggable(rightElement);

        return createElement("span", {className: "equality" }, [
            leftElement,
            createElement("span", { className: "operator", textContent: "=" }),
            rightElement,
        ]);
    }
}
export class IdentifierView extends ExpressionView<Identifier> {
    protected _createDomElement(): HTMLElement {
        const identifier = this.expression;

        const isFree = identifier.isFree();
        const subscriptElement = identifier.subscript !== undefined && createElement("sub", {textContent: String(identifier.subscript)});
        return createElement("span", { className: "identifier", classNames: isFree ? ["free"] : ["bound"] }, [
            String(identifier.name),
            ...(subscriptElement ? [subscriptElement] : [])
        ]);
    }
}

export class HoleView extends ExpressionView<Hole> {
    protected _createDomElement(): HTMLElement {
        const element = createElement("span", { className: "hole" });
        makeDropTarget(element, droppedExpression => {
            const droppedExpressionCopy = droppedExpression.copy();
            this.expression.fillWith(droppedExpressionCopy);
            const newExpressionElement = ExpressionView.forExpression(droppedExpressionCopy).domElement();
            newExpressionElement.classList.add("just-added");
            newExpressionElement.addEventListener("animationend", () => {
                newExpressionElement.classList.remove("just-added");
            }, { once: true });
            element.replaceWith(newExpressionElement);
        });
        return element;
    }
}

function binder(name: string) {
    return createElement("span", { className: "binder", textContent: name });
}

function parenthesized(...elements: Element[]) {
    return [
        leftParenthesis(),
        ...elements,
        rightParenthesis()
    ];
}

function leftParenthesis() {
    return createElement("span", {className: "parenthesis", textContent: "("});
}

function rightParenthesis() {
    return createElement("span", {className: "parenthesis", textContent: ")"});
}

function makeDraggable(element: HTMLElement) {
    element.id = crypto.randomUUID();
    element.setAttribute("draggable", "true");
    element.addEventListener("dragstart", (e) => {
        if (e.dataTransfer !== null) {
            e.dataTransfer.setData("text/plain", element.id);
            e.dataTransfer.dropEffect = "copy";
        }
    });
}

function makeDropTarget(element: HTMLElement, onDrop: (droppedExpression: Expression) => void) {
    element.addEventListener("dragenter", (e) => {
        element.classList.add("drop-target");
        e.preventDefault();
    });
    element.addEventListener("dragover", (e) => {
        e.preventDefault();
    });
    element.addEventListener("dragleave", (e) => {
        element.classList.remove("drop-target");
        e.preventDefault();
    });
    element.addEventListener("drop", (e) => {
        element.classList.remove("drop-target");
        const sourceElementId = e.dataTransfer!.getData("text/plain");
        const sourceElement = document.getElementById(sourceElementId)!;
        const sourceView = ExpressionView.forDomElement(sourceElement)!;

        onDrop(sourceView.expression);

        e.preventDefault();
    });
}
