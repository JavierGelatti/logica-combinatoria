import {CompoundExpression} from "./compoundExpression.ts";
import {successfulUnification, UnificationResult} from "../unificationResult.ts";
import {Identifier} from "./identifier.ts";
import {Hole} from "./hole.ts";

export const valueType = Symbol("valueType");
export const truthType = Symbol("truthType");
export type Value = typeof valueType;
export type Truth = typeof truthType;
export type ExpressionType = Value | Truth;

export abstract class Expression<T extends ExpressionType = any> {
    protected abstract _type: T;
    protected _parent: CompoundExpression<any> | undefined;

    equals(anotherObject: unknown): boolean {
        if (!(anotherObject instanceof this.constructor)) return false;

        return this._equals(anotherObject as this);
    }

    protected abstract _equals(anotherObject: this): boolean;

    abstract substitute(subExpressionToSubstitute: Expression<Value>, newExpression: Expression<Value>): Expression<T>;

    replace<S extends ExpressionType>(subExpressionToReplace: Expression<S>, newExpression: Expression<S>): Expression<T> {
        if (subExpressionToReplace as Expression === this) {
            return newExpression as Expression as Expression<T>;
        }

        return this._replaceChild(subExpressionToReplace, newExpression);
    }

    protected abstract _replaceChild<S extends ExpressionType>(subExpressionToReplace: Expression<S>, newExpression: Expression<S>): Expression<T>;

    insertedInto(newParent: CompoundExpression) {
        if (this._parent !== undefined) throw new Error("The expression already had a parent");

        this._parent = newParent;
    }

    abstract unifyWith(anotherExpression: Expression): UnificationResult;

    contains(anExpression: Expression): boolean {
        return this === anExpression || this._contains(anExpression);
    }

    protected abstract _contains(anExpression: Expression): boolean;

    abstract _containsOccurrenceOf(identifierDeclaration: Identifier): boolean;

    commonAncestor(anotherExpression: Expression): Expression | undefined {
        if (this.contains(anotherExpression)) {
            return this;
        }

        return this._parent?.commonAncestor(anotherExpression);
    }

    abstract copy(): this

    abstract freeVariables(): Set<Identifier>

    freeVariablesContain(aVariable: Identifier) {
        return this.freeVariables().values()
            .some(freeVariable => freeVariable.equals(aVariable));
    }

    isFreeVariableInParent(identifier: Identifier) {
        return this._parent?.isFreeVariable(identifier) ?? true;
    }

    detachFromParent(): Hole<T> {
        if (this._parent === undefined) throw new Error("Cannot detach root expression");

        return this._parent.detachChild(this);
    }

    detachedFrom(oldParent: CompoundExpression) {
        if (this._parent !== oldParent) throw new Error("Cannot detach from non-parent");

        this._parent = undefined;
    }

    needsParenthesis() {
        return false;
    }

    isRootExpression() {
        return this._parent === undefined;
    }

    rootExpression(): Expression {
        if (this._parent === undefined) {
            return this;
        }

        return this._parent.rootExpression();
    }

    type(): T {
        return this._type;
    }

    isValue(): this is Expression<Value> {
        return this._type === valueType;
    }

    hasType<S extends ExpressionType>(type: S): this is Expression<S> {
        // @ts-expect-error
        return this._type === type;
    }

    abstract allHolesOfType<T extends ExpressionType>(expressionType: T): Hole<T>[]

    abstract allSubExpressions(): Expression[]

    isComplete() {
        return this.allHolesOfType(valueType).length === 0 && this.allHolesOfType(truthType).length === 0;
    }

    abstract toString(): string;

    abstract allOccurrencesOf(lookedUpIdentifier: Identifier): Set<Identifier>

    protected successfulUnification(...bindings: [Identifier, Expression][]) {
        return successfulUnification(this.rootExpression(), ...bindings);
    }

    abstract rewriteWith(bindings: Map<Identifier, Expression>): Expression<T>;
}