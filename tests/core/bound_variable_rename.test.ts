import {describe, expect, test} from "vitest";
import {equality, forall, identifier} from "../../src/core/expression_constructors.ts";
import {ForAll} from "../../src/core/forAll.ts";

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

    function identity(variableName: string) {
        return equality(identifier(variableName), identifier(variableName));
    }
});