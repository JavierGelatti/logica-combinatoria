import {Expression} from "./expression.ts";
import {Identifier} from "./identifier.ts";
import {CompoundExpression} from "./compoundExpression.ts";
import {successfulUnification, unificationFailure, UnificationResult} from "./unificationResult.ts";
import {Hole} from "./hole.ts";

export abstract class Binder extends CompoundExpression {
    private _boundVariable: Identifier;
    private _body: Expression;

    private readonly _species: { new(boundVariable: Identifier, expression: Expression): Binder };

    protected constructor(
        boundVariable: Identifier,
        body: Expression,
        species: { new(boundVariable: Identifier, expression: Expression): Binder },
    ) {
        super(boundVariable, body);
        this._species = species;
        this._body = body;
        this._boundVariable = boundVariable;
    }

    get boundVariable() {
        return this._boundVariable
    }

    get body() {
        return this._body
    }

    protected _equals(anotherObject: this): boolean {
        const boundIdentifier = new Identifier(Symbol());
        return anotherObject.applyTo(boundIdentifier).equals(this.applyTo(boundIdentifier));
    }

    applyTo(boundVariableValue: Expression) {
        return this._body.replace(this._boundVariable, boundVariableValue);
    }

    public replace(subExpressionToReplace: Expression, newExpression: Expression): Expression {
        if (subExpressionToReplace.equals(this._boundVariable)) return this.copy();

        if (newExpression.freeVariablesContain(this._boundVariable)) {
            const newBoundVariable = this._boundVariable.withIncrementedSubscript()
            return new this._species(
                newBoundVariable,
                this._body.replace(this._boundVariable, newBoundVariable),
            ).replace(subExpressionToReplace, newExpression);
        }

        return new this._species(
            this._boundVariable.copy(),
            this._body.replace(subExpressionToReplace, newExpression),
        );
    }

    declarationOf(variable: Identifier): Identifier | undefined {
        if (this._boundVariable.equals(variable)) return this._boundVariable;

        return super.declarationOf(variable);
    }

    protected _unifyWith(anotherExpression: this): UnificationResult {
        return this._equals(anotherExpression) ? successfulUnification() : unificationFailure();
    }

    copy() {
        return new this._species(this._boundVariable.copy(), this._body.copy()) as this;
    }

    protected _fillHole(holeToFill: Hole, expressionToFillHole: Expression) {
        if (this._body === holeToFill) {
            this._body = expressionToFillHole;
        }
    }
}
