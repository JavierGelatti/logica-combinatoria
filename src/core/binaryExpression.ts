import {Expression} from "./expression.ts";

export class BinaryExpression extends Expression {
    constructor(
        readonly left: Expression,
        readonly right: Expression,
        private readonly species: { new(left: Expression, right: Expression): BinaryExpression },
    ) {
        super();
    }

    protected _equals(anotherObject: this): boolean {
        return anotherObject.left.equals(this.left) &&
            anotherObject.right.equals(this.right);
    }

    public replace(subExpressionToReplace: Expression, newExpression: Expression): Expression {
        return new this.species(
            this.left.replace(subExpressionToReplace, newExpression),
            this.right.replace(subExpressionToReplace, newExpression),
        );
    }
}