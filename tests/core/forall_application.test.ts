import {describe, expect, test} from "vitest";
import {application, forall, identifier} from "../../src/core/expression_constructors.ts";
import {Identifier} from "../../src/core/identifier.ts";
import {ForAll} from "../../src/core/forAll.ts";

describe("forall application", () => {
    test("when a forall is applied, it returns the body with all occurrences of the bound variable replaced by its argument", () => {
        const aForAll = forall(identifier("x"), identifier("x"));
        const argument = identifier("y");

        const result = aForAll.applyTo(argument);

        expect(result.equals(argument)).toBe(true);
        expect(result).not.toBe(argument);
    });

    test("when replacing a variable, it avoids incorrect variable capturing", () => {
        const aForAll = forall(
            identifier("x"),
            forall(identifier("y"), identifier("x"))
        );
        const argument = identifier("y");

        const result = aForAll.applyTo(argument);

        expect(result.equals(forall(identifier("y_0"), identifier("y")))).toBe(true);
    });

    test("when replacing a variable, it avoids incorrect variable capturing [nested quantifiers]", () => {
        const aForAll = forall(
            identifier("x"),
            forall(identifier("y"),
                application(identifier("y"), forall(identifier("y"), identifier("x")))
            )
        );
        const argument = identifier("y");

        const result = aForAll.applyTo(argument);

        expect(
            result.equals(
                forall(
                    identifier("y_0"),
                    application(identifier("y_0"), forall(identifier("y_1"), identifier("y")))
                )
            )
        ).toBe(true);
    });

    test("when replacing a variable, it avoids incorrect variable capturing [multiple renames]", () => {
        const aForAll = forall(
            identifier("x"),
            forall(identifier("y"), identifier("x"))
        );
        const argument = application(identifier("y"), identifier("y", 0));

        const result = aForAll.applyTo(argument);

        expect(
            result.equals(
                forall(
                    identifier("y_1"),
                    application(identifier("y"), identifier("y", 0))
                )
            )
        ).toBe(true);
    });
});