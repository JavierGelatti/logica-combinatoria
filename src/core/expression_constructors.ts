import {Expression} from "./expression.ts";
import {NamedIdentifier} from "./namedIdentifier.ts";
import {Application} from "./application.ts";
import {ForAll} from "./forAll.ts";
import {Exists} from "./exists.ts";

export function identifier(name: string) {
    return new NamedIdentifier(name);
}

export function application(functionBeingApplied: Expression, argument: Expression) {
    return new Application(functionBeingApplied, argument);
}

export function forall(boundVariable: NamedIdentifier, expression: Expression) {
    return new ForAll(boundVariable, expression);
}

export function exists(boundVariable: NamedIdentifier, expression: Expression) {
    return new Exists(boundVariable, expression);
}
