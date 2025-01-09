import {Expression, Truth, truthType, Value, valueType} from "./expression.ts";
import {Identifier} from "./identifier.ts";
import {Application} from "./application.ts";
import {ForAll} from "./forAll.ts";
import {Exists} from "./exists.ts";
import {Equality} from "./equality.ts";
import {Hole} from "./hole.ts";

export function identifier(name: string, subscript?: number) {
    return new Identifier(name, subscript);
}

export function application(functionBeingApplied: Expression<Value>, argument: Expression<Value>) {
    return new Application(functionBeingApplied, argument);
}

export function forall(boundVariable: Identifier, expression: Expression<Truth>) {
    return new ForAll(boundVariable, expression);
}

export function exists(boundVariable: Identifier, expression: Expression<Truth>) {
    return new Exists(boundVariable, expression);
}

export function equality(left: Expression<Value>, right: Expression<Value>) {
    return new Equality(left, right);
}

export function hole(): Hole<Value> {
    return new Hole(valueType);
}

export function truthHole(): Hole<Truth> {
    return new Hole(truthType);
}
