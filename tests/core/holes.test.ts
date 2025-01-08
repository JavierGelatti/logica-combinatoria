import {describe, expect, test} from "vitest";
import {application, forall, hole, identifier} from "../../src/core/expression_constructors.ts";
import {Expression} from "../../src/core/expression.ts";
import {Hole} from "../../src/core/hole.ts";

describe("holes", () => {
    test("can fill a hole at the left-hand position of an application", () => {
        let theHole!: Hole;
        const expressionWithHole: Expression = application(theHole = hole(), identifier("x"));

        theHole.fillWith(identifier("y"));

        expect(expressionWithHole).toEqual(application(identifier("y"), identifier("x")));
    });

    test("can fill a hole at the right-hand position of an application", () => {
        let theHole!: Hole;
        const expressionWithHole: Expression = application(identifier("x"), theHole = hole());

        theHole.fillWith(identifier("y"));

        expect(expressionWithHole).toEqual(application(identifier("x"), identifier("y")));
    });

    test("can fill a hole at the body of a binder", () => {
        let theHole!: Hole;
        const expressionWithHole: Expression = forall(identifier("x"), theHole = hole());

        theHole.fillWith(identifier("y"));

        expect(expressionWithHole).toEqual(forall(identifier("x"), identifier("y")));
    });

    test("cannot fill a hole without parent (i.e. root hole)", () => {
        const rootHole = hole();

        expect(() => {
            rootHole.fillWith(identifier("y"));
        }).toThrowError("Cannot fill root hole");
    });
});