import {application, equality, exists, forall, identifier} from "./src/core/expression_constructors";
import {ExpressionView} from "./src/dom/expression_view";
import {Expression} from "./src/core/expression";

const mockingbird = forall(
    identifier("x"),
    equality(
        application(identifier("M"), identifier("x")),
        application(identifier("x"), identifier("x")),
    )
);

show(mockingbird);

show(exists(
    identifier("x"),
    equality(
        application(identifier("x"), identifier("x")),
        application(
            application(identifier("x"), identifier("x")),
            identifier("x")
        ),
    )
));

const aForAll = forall(
    identifier("x"),
    forall(identifier("y"),
        application(identifier("y"), forall(identifier("y"), identifier("x")))
    )
);
const argument = application(identifier("y"), identifier("y", 0));
const result = aForAll.applyTo(argument);

show(result);

function show(expression: Expression) {
    document.body.append(ExpressionView.forExpression(expression).domElement());
}
