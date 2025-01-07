import {Expression} from "./expression.ts";

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
            return newExpression;
        } else {
            return this;
        }
    }
}