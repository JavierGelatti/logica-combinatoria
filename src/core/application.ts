import {Expression} from "./expression.ts";
import {BinaryExpression} from "./binaryExpression.ts";

export class Application extends BinaryExpression {
    constructor(
        readonly functionBeingApplied: Expression,
        readonly argument: Expression,
    ) {
        super(functionBeingApplied, argument, Application);
    }
}