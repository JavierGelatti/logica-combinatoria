import {describe, expect, test} from "vitest";
import {application, equality, exists, forall, identifier} from "../../src/core/expressions/expression_constructors.ts";
import {Identifier} from "../../src/core/expressions/identifier.ts";
import {successfulUnification, unificationFailure, UnificationSuccess} from "../../src/core/unificationResult.ts";
import {Application} from "../../src/core/expressions/application.ts";
import {Expression} from "../../src/core/expressions/expression.ts";

describe("unification", () => {
    describe("determination", () => {
        test("a free variable only unifies with the same free variable", () => {
            const freeVariable = identifier("x");
            const anotherFreeVariable = identifier("y");
            const theSameFreeVariable = identifier("x");
            const anotherExpression = application(identifier("x"), identifier("x"));

            expect(freeVariable.unifyWith(freeVariable)).toEqual(successfulUnification(freeVariable));
            expect(freeVariable.unifyWith(anotherFreeVariable)).toEqual(unificationFailure());
            expect(freeVariable.unifyWith(theSameFreeVariable)).toEqual(successfulUnification(freeVariable));
            expect(freeVariable.unifyWith(anotherExpression)).toEqual(unificationFailure());
        });

        test("a free variable unifies with a universally-bound variable, replacing the bound variable value with itself", () => {
            const freeVariable = identifier("x");
            let nonFreeVariable!: Identifier;
            const rootExpression = forall(identifier("x"), equality(identifier("w"), nonFreeVariable = identifier("x")));

            expect(nonFreeVariable.unifyWith(freeVariable))
                .toEqual(successfulUnification(rootExpression, [nonFreeVariable.declaration()!, freeVariable]));
            expect(freeVariable.unifyWith(nonFreeVariable)).toEqual(unificationFailure());
        });

        test("a free variable does not unify with an existentially-bound variable", () => {
            const freeVariable = identifier("x");
            let nonFreeVariable!: Identifier;
            exists(identifier("x"), equality(identifier("w"), nonFreeVariable = identifier("x")));

            expect(nonFreeVariable.unifyWith(freeVariable)).toEqual(unificationFailure());
        });

        test("two universally-bound variables unify, replacing one with the other", () => {
            let nonFreeVariable1!: Identifier;
            forall(identifier("x"), equality(identifier("w"), nonFreeVariable1 = identifier("x")));
            let nonFreeVariable2!: Identifier;
            forall(identifier("y"), equality(identifier("w"), nonFreeVariable2 = identifier("y")));

            expect(nonFreeVariable1.unifyWith(nonFreeVariable2))
                .toEqual(successfulUnification(nonFreeVariable1.rootExpression(), [nonFreeVariable1.declaration()!, nonFreeVariable2]));
        });

        test("a bound variable unifies with itself, without any replacements", () => {
            let nonFreeVariable1!: Identifier;
            let nonFreeVariable2!: Identifier;
            const rootExpression = exists(
                identifier("x"),
                equality(
                    nonFreeVariable1 = identifier("x"),
                    nonFreeVariable2 = identifier("x")
                )
            );

            expect(nonFreeVariable1.unifyWith(nonFreeVariable2)).toEqual(successfulUnification(rootExpression));
        });

        test("a compound expression unifies with a universally-bound variable, provided it does not contain the same variable", () => {
            const compoundExpression = application(identifier("x"), identifier("x"));
            let nonFreeVariable!: Identifier;
            const rootExpression = forall(identifier("x"), equality(identifier("w"), nonFreeVariable = identifier("x")));

            expect(nonFreeVariable.unifyWith(compoundExpression))
                .toEqual(successfulUnification(rootExpression, [nonFreeVariable.declaration()!, compoundExpression]));
        });

        test("a compound expression does not unify with a universally-bound variable if it contains the same variable", () => {
            let compoundExpression!: Expression;
            let nonFreeVariable!: Identifier;
            forall(identifier("x"), equality(
                nonFreeVariable = identifier("x"),
                compoundExpression = application(identifier("x"), identifier("x"))
            ));

            expect(nonFreeVariable.unifyWith(compoundExpression)).toEqual(unificationFailure());
        });

        test("two compound expressions that are not two applications will unify iff they are equal", () => {
            const aForall = forall(identifier("x"), equality(identifier("w"), identifier("x")));
            const theSameForall = forall(identifier("y"), equality(identifier("w"), identifier("y")));
            const anotherForall = forall(identifier("x"), equality(identifier("w"), identifier("y")));
            const anExists = exists(identifier("x"), equality(identifier("w"), identifier("x")));
            const anApplication = application(identifier("x"), identifier("x"));

            expect(aForall.unifyWith(aForall)).toEqual(successfulUnification(aForall));
            expect(aForall.unifyWith(theSameForall)).toEqual(successfulUnification(aForall));
            expect(aForall.unifyWith(anotherForall)).toEqual(unificationFailure());
            expect(aForall.unifyWith(anExists)).toEqual(unificationFailure());
            expect(anApplication.unifyWith(aForall)).toEqual(unificationFailure());
        });

        test("two applications will unify if both parts unify disjointedly", () => {
            let anApplication!: Application;
            let x!: Identifier, y!: Identifier, a!: Identifier, b!: Identifier;
            const rootExpression = forall(x = identifier("x"),
                forall(y = identifier("y"),
                    equality(
                        anApplication = application(identifier("x"), identifier("y")),
                        identifier("w")
                    )
                )
            );
            const anotherApplication = application(a = identifier("A"), b = identifier("B"));

            expect(anApplication.unifyWith(anotherApplication))
                .toEqual(successfulUnification(rootExpression, [x, a], [y, b]));
        });

        test("two applications will unify if both parts unify compatibly", () => {
            let anApplication!: Application;
            let x!: Identifier, a!: Identifier;
            const rootExpression = forall(x = identifier("x"),
                equality(
                    anApplication = application(identifier("x"), identifier("x")),
                    identifier("w")
                )
            );
            const anotherApplication = application(a = identifier("A"), identifier("A"));

            expect(anApplication.unifyWith(anotherApplication))
                .toEqual(successfulUnification(rootExpression, [x, a]));
        });

        test("two applications won't unify if both parts unify incompatibly", () => {
            let anApplication!: Application;
            forall(identifier("x"),
                equality(
                    anApplication = application(identifier("x"), identifier("x")),
                    identifier("w")
                )
            );
            const anotherApplication = application(identifier("A"), identifier("B"));

            expect(anApplication.unifyWith(anotherApplication)).toEqual(unificationFailure());
        });

        test("two applications won't unify if the left part fails", () => {
            let anApplication!: Application;
            forall(identifier("x"),
                equality(
                    anApplication = application(identifier("x"), identifier("A")),
                    identifier("w")
                )
            );
            const anotherApplication = application(identifier("B"), identifier("C"));

            expect(anApplication.unifyWith(anotherApplication)).toEqual(unificationFailure());
        });

        test("two applications won't unify if the right part fails", () => {
            let anApplication!: Application;
            forall(identifier("x"),
                equality(
                    anApplication = application(identifier("A"), identifier("x")),
                    identifier("w")
                )
            );
            const anotherApplication = application(identifier("B"), identifier("C"));

            expect(anApplication.unifyWith(anotherApplication)).toEqual(unificationFailure());
        });

        test("cannot merge two unification results if they don't share the same root expression", () => {
            let x!: Identifier, y!: Identifier;
            forall(identifier("x"),
                equality(
                    x = identifier("x"),
                    identifier("w")
                )
            );
            forall(identifier("y"),
                equality(
                    y = identifier("y"),
                    identifier("w")
                )
            );
            const unification1 = x.unifyWith(identifier("z"));
            const unification2 = y.unifyWith(identifier("z"));

            expect(() => unification1.combinedWith(unification2))
                .toThrowError("Wrong unification: all of the variables should belong to the same root expression");
        });

        test("an unification example", () => {
            let mockingbirdRHS!: Expression;
            let x!: Identifier, a!: Identifier;
            const rootExpression = forall(
                x = identifier("x"),
                equality(
                    mockingbirdRHS = application(identifier("M"), identifier("x")),
                    application(identifier("x"), identifier("x")),
                )
            );
            const mockingbirdApplication = application(identifier("M"), a = identifier("A"));

            expect(mockingbirdRHS.unifyWith(mockingbirdApplication))
                .toEqual(successfulUnification(rootExpression, [x, a]));
        });
    });

    describe("application", () => {
        test("a free variable unification can be applied", () => {
            const freeVariable = identifier("x");
            const theSameFreeVariable = identifier("x");

            const sucessfulUnification = freeVariable.unifyWith(theSameFreeVariable) as UnificationSuccess;

            expect(sucessfulUnification.apply()).toEqual(identifier("x"));
        });
    });
});