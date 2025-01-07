import {Expression} from "./expression.ts";
import {BinaryExpression} from "./binaryExpression.ts";

export class Application extends BinaryExpression {
    constructor(
        protected readonly functionBeingApplied: Expression,
        protected readonly argument: Expression,
    ) {
        super(functionBeingApplied, argument, Application);
    }
}