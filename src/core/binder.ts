import {Expression} from "./expression.ts";
import {NamedIdentifier} from "./namedIdentifier.ts";

export abstract class Binder extends Expression {
    protected constructor(
        private readonly boundVariable: NamedIdentifier,
        private readonly expression: Expression,
        private readonly species: { new(boundVariable: NamedIdentifier, expression: Expression): Binder },
    ) {
        super();
    }

    protected _equals(anotherObject: this): boolean {
        const boundIdentifier = new IdentityIdentifier();
        return anotherObject.boundTo(boundIdentifier).equals(this.boundTo(boundIdentifier));
    }

    boundTo(boundVariableValue: Expression) {
        return this.expression.replace(this.boundVariable, boundVariableValue);
    }

    public replace(subExpressionToReplace: Expression, newExpression: Expression): Expression {
        if (subExpressionToReplace.equals(this.boundVariable)) return this;

        return new this.species(
            this.boundVariable,
            this.expression.replace(subExpressionToReplace, newExpression),
        );
    }
}

class IdentityIdentifier extends Expression {
    protected _equals(anotherObject: this): boolean {
        return anotherObject === this;
    }

    public replace(subExpressionToReplace: Expression, newExpression: Expression): Expression {
        return this;
    }
}