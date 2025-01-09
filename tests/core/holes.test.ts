import {describe, expect, test} from "vitest";
import {
    application,
    equality,
    exists,
    forall,
    hole,
    identifier,
    truthHole,
} from "../../src/core/expression_constructors.ts";
import {Expression, Truth, truthType, Value, valueType} from "../../src/core/expression.ts";
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

    test("can find all the holes in an expression", () => {
        let hole1!: Hole<Value>, hole2!: Hole<Value>;
        const expression: Expression = exists(identifier("x"),
            equality(hole1 = hole(), application(hole2 = hole(), identifier("x")))
        );

        expect(expression.allHolesOfType(valueType)).toEqual([hole1, hole2]);
    });

    test("only finds the holes of the given type", () => {
        const expression1: Expression = exists(identifier("x"), truthHole());
        const expression2: Expression = forall(identifier("x"), equality(hole(), hole()));

        expect(expression1.allHolesOfType(truthType).length).toEqual(1);
        expect(expression1.allHolesOfType(valueType).length).toEqual(0);
        expect(expression2.allHolesOfType(truthType).length).toEqual(0);
        expect(expression2.allHolesOfType(valueType).length).toEqual(2);
    });
});