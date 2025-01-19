import {identifier} from "../core/expressions/expression_constructors.ts";
import {Identifier} from "../core/expressions/identifier.ts";

export function promptIdentifier(promptText: string, promptInitialValue: string = ""): Identifier | undefined {
    const newName = prompt(promptText, promptInitialValue)?.trim();
    if (newName === undefined) return;

    const nameRegex = /^([^\s\d]\S*?)_?(\d*)$/;
    const matchResult = newName.match(nameRegex);
    if (matchResult === null) {
        return promptIdentifier("Nombre inválido", newName);
    }

    const name = matchResult[1];
    const subscript = matchResult[2] !== "" ? Number(matchResult[2]) : undefined;
    return identifier(name, subscript);
}