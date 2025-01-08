import {Expression} from "../core/expression.ts";
import {Application} from "../core/application.ts";
import {ForAll} from "../core/forAll.ts";
import {Exists} from "../core/exists.ts";
import {Equality} from "../core/equality.ts";
import {Identifier} from "../core/identifier.ts";
import {createElement} from "./createElement.ts";
import {Hole} from "../core/hole.ts";

export abstract class ExpressionView<T extends Expression> {
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

    constructor(public readonly expression: T) {}

    abstract domElement(): Element
}

export class ApplicationView extends ExpressionView<Application> {
    domElement(): Element {
        const elementForFunction = ApplicationView.forExpression(this.expression.functionBeingApplied).domElement();
        const elementForArgument = ApplicationView.forExpression(this.expression.argument).domElement();

        if (this.expression.functionBeingApplied instanceof Application) {
            elementForFunction.prepend(leftParenthesis());
            elementForFunction.append(rightParenthesis());
        }

        if (this.expression.argument instanceof Application) {
            elementForArgument.prepend(leftParenthesis());
            elementForArgument.append(rightParenthesis());
        }

        return createElement("span", {className: "application" }, [
            elementForFunction,
            elementForArgument
        ]);
    }
}

export class ForAllView extends ExpressionView<ForAll> {
    domElement(): Element {
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
    domElement(): Element {
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
    domElement(): Element {
        const leftElement = ApplicationView.forExpression(this.expression.left).domElement();
        leftElement.setAttribute("draggable", "true");
        const rightElement = ApplicationView.forExpression(this.expression.right).domElement();
        rightElement.setAttribute("draggable", "true");
        
        return createElement("span", {className: "equality" }, [
            leftElement,
            createElement("span", { className: "operator", textContent: "=" }),
            rightElement,
        ]);
    }
}

export class IdentifierView extends ExpressionView<Identifier> {
    domElement(): Element {
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
    domElement(): Element {
        return createElement("span", { className: "hole" });
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
