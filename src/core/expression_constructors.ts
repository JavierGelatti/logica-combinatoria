import {Expression} from "./expression.ts";
import {Identifier} from "./identifier.ts";
import {Application} from "./application.ts";
import {ForAll} from "./forAll.ts";
import {Exists} from "./exists.ts";
import {Equality} from "./equality.ts";

export function identifier(name: string) {
    return new Identifier(name);
}

export function application(functionBeingApplied: Expression, argument: Expression) {
    return new Application(functionBeingApplied, argument);
}

export function forall(boundVariable: Identifier, expression: Expression) {
    return new ForAll(boundVariable, expression);
}

export function exists(boundVariable: Identifier, expression: Expression) {
    return new Exists(boundVariable, expression);
}

export function equality(left: Expression, right: Expression) {
    return new Equality(left, right);
}
