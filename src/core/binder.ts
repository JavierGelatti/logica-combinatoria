import {Expression} from "./expression.ts";
import {Identifier} from "./identifier.ts";

export abstract class Binder extends Expression {
    protected constructor(
        readonly boundVariable: Identifier,
        readonly body: Expression,
        private readonly species: { new(boundVariable: Identifier, expression: Expression): Binder },
    ) {
        super();
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
}
