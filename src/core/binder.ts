import {Expression} from "./expression.ts";
import {Identifier} from "./identifier.ts";
import {CompoundExpression} from "./compoundExpression.ts";
import {successfulUnification, unificationFailure, UnificationResult} from "./unificationResult.ts";

export abstract class Binder extends CompoundExpression {
    protected constructor(
        readonly boundVariable: Identifier,
        readonly body: Expression,
        private readonly species: { new(boundVariable: Identifier, expression: Expression): Binder },
    ) {
        super(boundVariable, body);
    }

    protected _equals(anotherObject: this): boolean {
        const boundIdentifier = new Identifier(Symbol());
        return anotherObject.applyTo(boundIdentifier).equals(this.applyTo(boundIdentifier));
    }

    applyTo(boundVariableValue: Expression) {
        return this.body.replace(this.boundVariable, boundVariableValue);
    }

    public replace(subExpressionToReplace: Expression, newExpression: Expression): Expression {
        if (subExpressionToReplace.equals(this.boundVariable)) return this.copy();

        if (newExpression.freeVariablesContain(this.boundVariable)) {
            const newBoundVariable = this.boundVariable.withIncrementedSubscript()
            return new this.species(
                newBoundVariable,
                this.body.replace(this.boundVariable, newBoundVariable),
            ).replace(subExpressionToReplace, newExpression);
        }

        return new this.species(
            this.boundVariable.copy(),
            this.body.replace(subExpressionToReplace, newExpression),
        );
    }

    declarationOf(variable: Identifier): Identifier | undefined {
        if (this.boundVariable.equals(variable)) return this.boundVariable;

        return super.declarationOf(variable);
    }

    protected _unifyWith(anotherExpression: this): UnificationResult {
        return this._equals(anotherExpression) ? successfulUnification() : unificationFailure();
    }

    copy() {
        return new this.species(this.boundVariable.copy(), this.body.copy()) as this;
    }
}
