import {describe, expect, test} from "vitest";
import {application, equality, exists, forall, identifier} from "../../src/core/expression_constructors.ts";
import {Identifier} from "../../src/core/identifier.ts";
import {successfulUnification, unificationFailure} from "../../src/core/unificationResult.ts";
import {Application} from "../../src/core/application.ts";
import {Expression} from "../../src/core/expression.ts";

describe("unification", () => {
    test("a free variable only unifies with the same free variable", () => {
        const freeVariable = identifier("x");
        const anotherFreeVariable = identifier("y");
        const theSameFreeVariable = identifier("x");
        const anotherExpression = application(identifier("x"), identifier("x"));

        expect(freeVariable.unifyWith(freeVariable)).toEqual(successfulUnification());
        expect(freeVariable.unifyWith(anotherFreeVariable)).toEqual(unificationFailure());
        expect(freeVariable.unifyWith(theSameFreeVariable)).toEqual(successfulUnification());
        expect(freeVariable.unifyWith(anotherExpression)).toEqual(unificationFailure());
    });

    test("a free variable unifies with a universally-bound variable, replacing the bound variable value with itself", () => {
        const freeVariable = identifier("x");
        let nonFreeVariable!: Identifier;
        forall(identifier("x"), nonFreeVariable = identifier("x"));

        expect(nonFreeVariable.unifyWith(freeVariable)).toEqual(successfulUnification([nonFreeVariable, freeVariable]));
        expect(freeVariable.unifyWith(nonFreeVariable)).toEqual(unificationFailure());
    });
    
    test("a free variable does not unify with an existentially-bound variable", () => {
        const freeVariable = identifier("x");
        let nonFreeVariable!: Identifier;
        exists(identifier("x"), nonFreeVariable = identifier("x"));

        expect(nonFreeVariable.unifyWith(freeVariable)).toEqual(unificationFailure());
    });

    test("two universally-bound variables unify, replacing one with the other", () => {
        let nonFreeVariable1!: Identifier;
        forall(identifier("x"), nonFreeVariable1 = identifier("x"));
        let nonFreeVariable2!: Identifier;
        forall(identifier("y"), nonFreeVariable2 = identifier("y"));

        expect(nonFreeVariable1.unifyWith(nonFreeVariable2)).toEqual(successfulUnification([nonFreeVariable1, nonFreeVariable2]));
    });

    test("a bound variable unifies with itself, without any replacements", () => {
        let nonFreeVariable1!: Identifier;
        let nonFreeVariable2!: Identifier;
        exists(
            identifier("x"),
            application(
                nonFreeVariable1 = identifier("x"),
                nonFreeVariable2 = identifier("x")
            )
        );

        expect(nonFreeVariable1.unifyWith(nonFreeVariable2)).toEqual(successfulUnification());
    });

    test("a compound expression unifies with a universally-bound variable, provided it does not contain the same variable", () => {
        const compoundExpression = application(identifier("x"), identifier("x"));
        let nonFreeVariable!: Identifier;
        forall(identifier("x"), nonFreeVariable = identifier("x"));

        expect(nonFreeVariable.unifyWith(compoundExpression)).toEqual(successfulUnification([nonFreeVariable, compoundExpression]));
    });

    test("a compound expression does not unify with a universally-bound variable if it contains the same variable", () => {
        let compoundExpression!: Expression;
        let nonFreeVariable!: Identifier;
        forall(identifier("x"), application(
            nonFreeVariable = identifier("x"),
            compoundExpression = application(identifier("x"), identifier("x"))
        ));

        expect(nonFreeVariable.unifyWith(compoundExpression)).toEqual(unificationFailure());
    });

    test("two compound expressions that are not two applications will unify iff they are equal", () => {
        const aForall = forall(identifier("x"), identifier("x"));
        const theSameForall = forall(identifier("y"), identifier("y"));
        const anotherForall = forall(identifier("x"), identifier("y"));
        const anExists = exists(identifier("x"), identifier("x"));
        const anApplication = application(identifier("x"), identifier("x"));

        expect(aForall.unifyWith(aForall)).toEqual(successfulUnification());
        expect(aForall.unifyWith(theSameForall)).toEqual(successfulUnification());
        expect(aForall.unifyWith(anotherForall)).toEqual(unificationFailure());
        expect(aForall.unifyWith(anExists)).toEqual(unificationFailure());
        expect(anApplication.unifyWith(aForall)).toEqual(unificationFailure());
    });

    test("two applications will unify if both parts unify disjointedly", () => {
        let anApplication!: Application;
        let x!: Identifier, y!: Identifier, a!: Identifier, b!: Identifier;
        forall(x = identifier("x"),
            forall(y = identifier("y"),
                anApplication = application(identifier("x"), identifier("y"))
            )
        );
        const anotherApplication = application(a = identifier("A"), b = identifier("B"));

        expect(anApplication.unifyWith(anotherApplication)).toEqual(successfulUnification([x, a], [y, b]));
    });

    test("two applications will unify if both parts unify compatibly", () => {
        let anApplication!: Application;
        let x!: Identifier, a!: Identifier;
        forall(x = identifier("x"),
            anApplication = application(identifier("x"), identifier("x"))
        );
        const anotherApplication = application(a = identifier("A"), identifier("A"));

        expect(anApplication.unifyWith(anotherApplication)).toEqual(successfulUnification([x, a]));
    });

    test("two applications won't unify if both parts unify incompatibly", () => {
        let anApplication!: Application;
        forall(identifier("x"),
            anApplication = application(identifier("x"), identifier("x"))
        );
        const anotherApplication = application(identifier("A"), identifier("B"));

        expect(anApplication.unifyWith(anotherApplication)).toEqual(unificationFailure());
    });

    test("two applications won't unify if the left part fails", () => {
        let anApplication!: Application;
        forall(identifier("x"),
            anApplication = application(identifier("x"), identifier("A"))
        );
        const anotherApplication = application(identifier("B"), identifier("C"));

        expect(anApplication.unifyWith(anotherApplication)).toEqual(unificationFailure());
    });

    test("two applications won't unify if the right part fails", () => {
        let anApplication!: Application;
        forall(identifier("x"),
            anApplication = application(identifier("A"), identifier("x"))
        );
        const anotherApplication = application(identifier("B"), identifier("C"));

        expect(anApplication.unifyWith(anotherApplication)).toEqual(unificationFailure());
    });

    test("an unification example", () => {
        let mockingbirdRHS!: Expression;
        let x!: Identifier, a!: Identifier;
        forall(
            x = identifier("x"),
            equality(
                mockingbirdRHS = application(identifier("M"), identifier("x")),
                application(identifier("x"), identifier("x")),
            )
        );
        const mockingbirdApplication = application(identifier("M"), a = identifier("A"));

        expect(mockingbirdRHS.unifyWith(mockingbirdApplication)).toEqual(successfulUnification([x, a]));
    });
});