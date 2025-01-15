import {Expression, ExpressionType, Value, valueType} from "../core/expressions/expression.ts";
import {Application} from "../core/expressions/application.ts";
import {ForAll} from "../core/expressions/forAll.ts";
import {Exists} from "../core/expressions/exists.ts";
import {Equality} from "../core/expressions/equality.ts";
import {Identifier} from "../core/expressions/identifier.ts";
import {createElement} from "./essentials/createElement.ts";
import {Hole} from "../core/expressions/hole.ts";
import {animateWith} from "./essentials/animation.ts";
import {Binder} from "../core/expressions/binder.ts";
import {identifier} from "../core/expressions/expression_constructors.ts";
import {GrabInteraction} from "./user_interactions/grabInteraction.ts";

export abstract class ExpressionView<T extends Expression = Expression> {
    private static readonly modelKey = Symbol("model");
    private static readonly views: WeakMap<Expression, WeakRef<ExpressionView>> = new WeakMap();

    static forDomElement(element: HTMLElement): ExpressionView | undefined {
        return Reflect.get(element, this.modelKey);
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

    private readonly _isDraggable: boolean;
    private _domElement?: HTMLElement;
    declare private _currentGrabInteraction: GrabInteraction | undefined;

    constructor(
        public readonly expression: T,
        isDraggable: boolean = true
    ) {
        this._isDraggable = isDraggable;
    }

    get isDraggable() {
        return this._isDraggable;
    }

    domElement(): HTMLElement {
        if (this._domElement === undefined) {
            this._domElement = this._createDomElement();

            Reflect.set(this._domElement, ExpressionView.modelKey, this);

            this._domElement.classList.add("expression");
            if (this.isDraggable) {
                this._domElement.setAttribute("draggable", "true");
            }

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

    isValue(): this is ExpressionView<Expression<Value>> {
        return this.expression.isValue();
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

    startGrabInteraction(grabInteraction: GrabInteraction) {
        this._currentGrabInteraction = grabInteraction;
    }

    currentGrabInteraction() {
        return this._currentGrabInteraction;
    }

    stopGrabInteraction(grabInteraction: GrabInteraction) {
        if (this._currentGrabInteraction !== grabInteraction) throw new Error("Stopped a non-current grab interaction");
        delete this._currentGrabInteraction;
    }
}

export class ApplicationView extends ExpressionView<Application> {
    protected _createDomElement(): HTMLElement {
        const elementForFunction = ExpressionView.forExpression(this.expression.functionBeingApplied).domElement();
        const elementForArgument = ExpressionView.forExpression(this.expression.argument).domElement();

        return createElement("span", {className: "application" }, [
            elementForFunction,
            elementForArgument
        ]);
    }
}

abstract class BinderView<T extends Binder> extends ExpressionView<T> {
    protected abstract _binderSymbol: string;
    protected abstract _binderCssClass: string;

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
        return createElement("span", {className: this._binderCssClass }, [
            createElement(
                "span",
                {
                    className: "full-binder",
                    onclick: e => e.stopPropagation(),
                    ondblclick: () => this.promptVariableRename()
                },
                [
                    ...parenthesized(
                        this._binderElement(this._binderSymbol),
                        new IdentifierView(this.expression.boundVariable, false).domElement()
                    ),
                ]),
            ExpressionView.forExpression(this.expression.body).domElement(),
        ]);
    }
}

export class ForAllView extends BinderView<ForAll> {
    protected _binderSymbol = "∀";
    protected _binderCssClass = "forall";
}

export class ExistsView extends BinderView<Exists> {
    protected _binderSymbol = "∃";
    protected _binderCssClass = "exists";
}

export class EqualityView extends ExpressionView<Equality> {
    protected _createDomElement(): HTMLElement {
        return createElement("span", {className: "equality" }, [
            ExpressionView.forExpression(this.expression.left).domElement(),
            createElement("span", { className: "operator", textContent: "=" }),
            ExpressionView.forExpression(this.expression.right).domElement(),
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
    constructor(expression: Hole<T>) {
        super(expression, false);
    }

    protected _createDomElement(): HTMLElement {
        return createElement("span", {className: "hole", classNames: [this.expression.type() === valueType ? "value" : "truth"]});
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

