import {Expression} from "./expression.ts";
import {successfulUnification, unificationFailure, UnificationResult} from "./unificationResult.ts";
import {Exists} from "./exists.ts";

export class Identifier extends Expression {
    constructor(
        readonly name: string | symbol,
    ) {
        super();
    }

    protected _equals(anotherObject: this): boolean {
        return anotherObject.name === this.name;
    }

    public replace(subExpressionToReplace: Expression, newExpression: Expression): Expression {
        if (subExpressionToReplace.equals(this)) {
            return newExpression.copy();
        } else {
            return this.copy();
        }
    }

    copy() {
        return new Identifier(this.name) as this;
    }

    isFree() {
        return this._parent?.isFreeVariable(this) ?? true;
    }

    unifyWith(anotherExpression: Expression) {
        if (this.isFree()) {
            return this._unifyWhenFree(anotherExpression);
        } else {
            return this._unifyWhenBound(anotherExpression);
        }
    }

    private _unifyWhenFree(anotherExpression: Expression) {
        if (!(anotherExpression instanceof Identifier)) return unificationFailure();

        if (anotherExpression.isFree()) {
            return this.equals(anotherExpression) ? successfulUnification() : unificationFailure();
        }

        return unificationFailure();
    }

    private _unifyWhenBound(anotherExpression: Expression): UnificationResult {
        const declarationOfThis = this.declaration()!;

        if (this.isExistentiallyBound()) {
            if (!(anotherExpression instanceof Identifier)) return unificationFailure();

            if (declarationOfThis !== anotherExpression.declaration()) return unificationFailure();

            return successfulUnification();
        } else {
            if (!(anotherExpression instanceof Identifier)) {
                if (anotherExpression._containsOcurrenceOf(declarationOfThis)) {
                    return unificationFailure();
                } else {
                    return successfulUnification([declarationOfThis, anotherExpression]);
                }
            }

            if (declarationOfThis === anotherExpression.declaration()) {
                return successfulUnification();
            }

            if (anotherExpression.isFree()) {
                return successfulUnification([declarationOfThis, anotherExpression]);
            }

            return successfulUnification([declarationOfThis, anotherExpression]);
        }
    }

    private isExistentiallyBound() {
        return this.declaration()?._parent instanceof Exists;
    }

    declaration() {
        return this._parent?.declarationOf(this) ?? undefined;
    }

    protected _contains(_anExpression: Expression): boolean {
        return false;
    }

    _containsOcurrenceOf(identifierDeclaration: Identifier): boolean {
        return this.declaration() === identifierDeclaration;
    }

    freeVariables(): Set<Identifier> {
        return this.isFree() ? new Set([this]) : new Set();
    }
}