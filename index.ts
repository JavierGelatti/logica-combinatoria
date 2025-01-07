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

function show(expression: Expression) {
    document.body.append(ExpressionView.forExpression(expression).domElement());
}
