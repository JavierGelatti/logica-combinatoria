import {describe, expect, test} from "vitest";
import {equality, forall, identifier} from "../../src/core/expressions/expression_constructors.ts";
import {ForAll} from "../../src/core/expressions/forAll.ts";

describe("variable renaming", () => {
    test("when the variable is renamed, all of its bound occurrences are renamed", () => {
        const aForAll = forall(identifier("x"), identity("x"));

        const result = aForAll.renameVariableTo(identifier("y"));

        expect(result).toEqual(forall(identifier("y"), identity("y")));
    });

    test("if the new name was 'globally' free in the expression, the rename cannot be done", () => {
        const aForAll = forall(identifier("x"), equality(identifier("x"), identifier("y")));

        expect(() => aForAll.renameVariableTo(identifier("y")))
            .toThrowError("Cannot rename: y is free in the expression");
    });

    test("if the new name is not globally free but it is free in the expression body, the rename cannot be done", () => {
        let aForAll!: ForAll;
        forall(identifier("y"),
            aForAll = forall(identifier("x"),
                equality(identifier("x"), identifier("y"))
            )
        );

        expect(() => aForAll.renameVariableTo(identifier("y")))
            .toThrowError("Cannot rename: y is free in the expression");
    });

    test("when a root expression is renamed, the same object is mutated", () => {
        const aForAll = forall(identifier("x"), identity("x"));

        const result = aForAll.renameVariableTo(identifier("y"));

        expect(result).toBe(aForAll);
    });

    test("when a subexpression is renamed, a renamed copy is returned", () => {
        let aForAll!: ForAll;
        forall(identifier("y"),
            aForAll = forall(identifier("x"), identity("x"))
        );

        const result = aForAll.renameVariableTo(identifier("y"));

        expect(result).toEqual(forall(identifier("y"), identity("y")));
        expect(result).not.toBe(aForAll);
        expect(aForAll.copy()).toEqual(forall(identifier("x"), identity("x")));
    });

    function identity(variableName: string) {
        return equality(identifier(variableName), identifier(variableName));
    }
});