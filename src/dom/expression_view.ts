import {Expression, ExpressionType} from "../core/expression.ts";
import {Application} from "../core/application.ts";
import {ForAll} from "../core/forAll.ts";
import {Exists} from "../core/exists.ts";
import {Equality} from "../core/equality.ts";
import {Identifier} from "../core/identifier.ts";
import {createElement} from "./essentials/createElement.ts";
import {Hole} from "../core/hole.ts";
import {animateWith} from "./essentials/animation.ts";
import {Binder} from "../core/binder.ts";
import {identifier} from "../core/expression_constructors.ts";

export abstract class ExpressionView<T extends Expression = Expression> {
    private static readonly modelKey = Symbol("model");
    private static readonly views: WeakMap<Expression, WeakRef<ExpressionView>> = new WeakMap();

    static forDomElement(element: HTMLElement): ExpressionView | undefined {
        const expressionView: ExpressionView | undefined = Reflect.get(element, this.modelKey);
        if (expressionView === undefined) throw new Error("The dom element was not an expression view");

        return expressionView;
    }

    static forExpression<E extends Expression, V extends ExpressionView<E>>(expression: E): V {
        const existingView = this.views.get(expression)?.deref();
        if (existingView !== undefined) {
            return existingView as V;
        }

        const view = this._instantiateViewForExpression(expression);
        this.views.set(expression, new WeakRef(view));
        return view as unknown as V;
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
    expressionType() {
        return this.expression.type();
    }

    detachFromParent() {
        const newHole = this.expression.detachFromParent();
        this.domElement().replaceWith(
            ExpressionView.forExpression(newHole).domElement(),
        );
    }

    isForRootExpression() {
        return this.expression.isRootExpression();
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

abstract class BinderView<T extends Binder> extends ExpressionView<T> {
    protected abstract _binderSymbol: string;

    promptVariableRename(
        promptText: string = "Nuevo nombre",
        promptInitialValue: string = this.expression.boundVariable.toString()
    ): void {
        const newName = prompt(promptText, promptInitialValue)?.trim();
        if (newName === undefined) return;

        const nameRegex = /^([^\s\d]\S*?)_?(\d*)$/;
        const matchResult = newName.match(nameRegex);
        if (matchResult === null) {
            return this.promptVariableRename("Nombre inválido", newName);
        }

        const name = matchResult[1];
        const subscript = matchResult[2] !== "" ? Number(matchResult[2]) : undefined;
        const newIdentifier = identifier(name, subscript);

        if (this.expression.hasLocallyUnbound(newIdentifier)) {
            return this.promptVariableRename("No se puede renombrar: el nombre aparece libre en la expresión", newIdentifier.toString());
        }

        const newExpression = this.expression.renameVariableTo(newIdentifier);
        if (!this.expression.isRootExpression()) {
            this.expression.detachFromParent().fillWith(newExpression);
        }
        const newExpressionView = ExpressionView.forExpression(newExpression);
        this.domElement().replaceWith(newExpressionView.domElement());
    }

    protected _binderElement(name: string) {
        return createElement("span", { className: "binder", textContent: name });
    }

    protected _createDomElement(): HTMLElement {
        return createElement("span", {className: "exists" }, [
            createElement(
                "span",
                {className: "full-binder", ondblclick: () => this.promptVariableRename()},
                [
                    ...parenthesized(
                        this._binderElement(this._binderSymbol),
                        ApplicationView.forExpression(this.expression.boundVariable).domElement()
                    ),
                ]),
            ApplicationView.forExpression(this.expression.body).domElement(),
        ]);
    }
}

export class ForAllView extends BinderView<ForAll> {
    protected _binderSymbol = "∀";
}

export class ExistsView extends BinderView<Exists> {
    protected _binderSymbol = "∃";
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
        if (droppedExpression.hasType(this.expressionType())) {
            const droppedExpressionCopy = droppedExpression.copy();
            this.expression.fillWith(droppedExpressionCopy);
            const newExpressionView = ExpressionView.forExpression(droppedExpressionCopy);
            const newExpressionElement = newExpressionView.domElement();
            animateWith(newExpressionElement, "just-added");
            this.domElement().replaceWith(newExpressionElement);
            return newExpressionView;
        }
    }
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

