import {describe, expect, test} from "vitest";
import {application, equality, forall, hole, identifier, truthHole} from "../../src/core/expression_constructors.ts";
import {Expression, Truth, Value} from "../../src/core/expression.ts";
import {Hole} from "../../src/core/hole.ts";

describe("holes", () => {
    test("can fill a hole at the left-hand position of an application", () => {
        let theHole!: Hole<Value>;
        const expressionWithHole: Expression = application(theHole = hole(), identifier("x"));

        theHole.fillWith(identifier("y"));

        expect(expressionWithHole).toEqual(application(identifier("y"), identifier("x")));
    });

    test("can fill a hole at the right-hand position of an application", () => {
        let theHole!: Hole<Value>;
        const expressionWithHole: Expression = application(identifier("x"), theHole = hole());

        theHole.fillWith(identifier("y"));

        expect(expressionWithHole).toEqual(application(identifier("x"), identifier("y")));
    });

    test("can fill a hole at the body of a binder", () => {
        let theHole!: Hole<Truth>;
        const expressionWithHole: Expression = forall(identifier("x"), theHole = truthHole());

        theHole.fillWith(equality(identifier("y"), identifier("y")));

        expect(expressionWithHole).toEqual(forall(identifier("x"), equality(identifier("y"), identifier("y"))));
    });

    test("cannot fill a hole without parent (i.e. root hole)", () => {
        const rootHole = hole();

        expect(() => {
            rootHole.fillWith(identifier("y"));
        }).toThrowError("Cannot fill root hole");
    });

    test("can detach an expression from its parent", () => {
        let subexpression!: Expression;
        const expression: Expression = application(subexpression = identifier("y"), identifier("x"));

        subexpression.detachFromParent();

        expect(expression).toEqual(application(hole(), identifier("x")));
        expect(subexpression).toEqual(identifier("y"));
    });

    test("cannot detach an expression without parent (i.e. root expression)", () => {
        const rootExpression = identifier("x");

        expect(() => {
            rootExpression.detachFromParent();
        }).toThrowError("Cannot detach root expression");
    });
});