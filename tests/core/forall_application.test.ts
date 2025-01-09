import {describe, expect, test} from "vitest";
import {application, equality, forall, identifier} from "../../src/core/expression_constructors.ts";

describe("forall application", () => {
    test("when a forall is applied, it returns the body with all occurrences of the bound variable replaced by its argument", () => {
        const aForAll = forall(identifier("x"), identity("x"));
        const argument = identifier("y");

        const result = aForAll.applyTo(argument);

        expect(result.equals(identity("y"))).toBe(true);
    });

    test("when replacing a variable, it avoids incorrect variable capturing", () => {
        const aForAll = forall(
            identifier("x"),
            forall(identifier("y"), identity("x"))
        );
        const argument = identifier("y");

        const result = aForAll.applyTo(argument);

        expect(result.equals(forall(identifier("y_0"), identity("y")))).toBe(true);
    });

    test("when replacing a variable, it avoids incorrect variable capturing [nested quantifiers]", () => {
        const aForAll = forall(
            identifier("x"),
            forall(identifier("y"),
                forall(identifier("y"), equality(identifier("x"), identifier("y")))
            )
        );
        const argument = identifier("y");

        const result = aForAll.applyTo(argument);

        expect(
            result.equals(
                forall(
                    identifier("y_0"),
                    forall(identifier("y_1"), equality(identifier("y"), identifier("y_1")))
                )
            )
        ).toBe(true);
    });

    test("when replacing a variable, it avoids incorrect variable capturing [multiple renames]", () => {
        const aForAll = forall(
            identifier("x"),
            forall(identifier("y"), equality(identifier("y"), identifier("x")))
        );
        const argument = application(identifier("y"), identifier("y", 0));

        const result = aForAll.applyTo(argument);

        expect(
            result.equals(
                forall(
                    identifier("y", 1),
                    equality(
                        identifier("y", 1),
                        application(identifier("y"), identifier("y", 0))
                    )
                )
            )
        ).toBe(true);
    });

    function identity(variableName: string) {
        return equality(identifier(variableName), identifier(variableName));
    }
});