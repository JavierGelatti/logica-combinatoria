import {Expression} from "./expression.ts";
import {BinaryExpression} from "./binaryExpression.ts";

export class Application extends BinaryExpression {
    constructor(functionBeingApplied: Expression, argument: Expression) {
        super(functionBeingApplied, argument, Application);
    }

    get functionBeingApplied() {
        return this.left;
    }

    get argument() {
        return this.right;
    }

    needsParenthesis() {
        return this._parent instanceof Application;
    }
}