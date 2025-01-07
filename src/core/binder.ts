import {Expression} from "./expression.ts";
import {Identifier} from "./identifier.ts";
import {CompoundExpression} from "./compoundExpression.ts";

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
        return anotherObject.boundTo(boundIdentifier).equals(this.boundTo(boundIdentifier));
    }

    boundTo(boundVariableValue: Expression) {
        return this.body.replace(this.boundVariable, boundVariableValue);
    }

    public replace(subExpressionToReplace: Expression, newExpression: Expression): Expression {
        if (subExpressionToReplace.equals(this.boundVariable)) return this;

        return new this.species(
            this.boundVariable,
            this.body.replace(subExpressionToReplace, newExpression),
        );
    }

    isFreeVariable(variable: Identifier): boolean {
        if (this.boundVariable.equals(variable)) return false;

        return super.isFreeVariable(variable);
    }
}
