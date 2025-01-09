import {Expression, Value, valueType} from "./expression.ts";
import {BinaryExpression} from "./binaryExpression.ts";

export class Application extends BinaryExpression<Value, Value> {
    protected _type: Value = valueType;

    constructor(functionBeingApplied: Expression<Value>, argument: Expression<Value>) {
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