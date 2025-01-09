import {Expression, ExpressionType} from "../core/expression.ts";
import {Application} from "../core/application.ts";
import {ForAll} from "../core/forAll.ts";
import {Exists} from "../core/exists.ts";
import {Equality} from "../core/equality.ts";
import {Identifier} from "../core/identifier.ts";
import {createElement} from "./createElement.ts";
import {Hole} from "../core/hole.ts";
import {DraggableConfiguration, makeDraggable} from "./drag_and_drop.ts";
import {animateWith} from "./animation.ts";

export abstract class ExpressionView<T extends Expression = Expression> {
    private static readonly modelKey = Symbol("model");
    private static readonly views: WeakMap<Expression, WeakRef<ExpressionView>> = new WeakMap();

    static forDomElement(element: HTMLElement): ExpressionView | undefined {
        const expressionView: ExpressionView | undefined = Reflect.get(element, this.modelKey);
        if (expressionView === undefined) throw new Error("The dom element was not an expression view");

        return expressionView;
    }

    static forExpression<T extends ExpressionType>(expression: Expression<T>): ExpressionView {
        const existingView = this.views.get(expression)?.deref();
        if (existingView !== undefined) {
            return existingView;
        }

        const view = this._instantiateViewForExpression(expression);
        this.views.set(expression, new WeakRef(view));
        return view;
    }

    private static _instantiateViewForExpression(expression: Expression) {
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

            Reflect.set(this._domElement, ExpressionView.modelKey, this);

            this._domElement.classList.add("expression");

            if (this.expression.needsParenthesis()) {
                this._domElement.prepend(leftParenthesis());
                this._domElement.append(rightParenthesis());
            }
        }

        return this._domElement;
    }

    protected abstract _createDomElement(): HTMLElement

    makeDraggable(configuration?: DraggableConfiguration): void {
        makeDraggable(this.domElement(), configuration);
    }
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
        return createElement("span", {className: "equality" }, [
            ApplicationView.forExpression(this.expression.left).domElement(),
            createElement("span", { className: "operator", textContent: "=" }),
            ApplicationView.forExpression(this.expression.right).domElement(),
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

export class HoleView<T extends ExpressionType> extends ExpressionView<Hole<T>> {
    protected _createDomElement(): HTMLElement {
        return createElement("span", {className: "hole"});
    }

    fillWith(droppedExpressionView: ExpressionView) {
        const droppedExpression = droppedExpressionView.expression;
        if (droppedExpression.hasType(this.expression.type())) {
            const droppedExpressionCopy = droppedExpression.copy();
            this.expression.fillWith(droppedExpressionCopy);
            const newExpressionView = ExpressionView.forExpression(droppedExpressionCopy);
            newExpressionView.makeDraggable();
            const newExpressionElement = newExpressionView.domElement();
            animateWith(newExpressionElement, "just-added");
            this.domElement().replaceWith(newExpressionElement);
        }
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

