import {Expression} from "./expression.ts";

export class Application extends Expression {
    constructor(
        private readonly functionBeingApplied: Expression,
        private readonly argument: Expression,
    ) {
        super();
    }

    protected _equals(anotherObject: this): boolean {
        return anotherObject.functionBeingApplied.equals(this.functionBeingApplied) &&
            anotherObject.argument.equals(this.argument);
    }

    public replace(subExpressionToReplace: Expression, newExpression: Expression): Expression {
        return new Application(
            this.functionBeingApplied.replace(subExpressionToReplace, newExpression),
            this.argument.replace(subExpressionToReplace, newExpression),
        );
    }
}