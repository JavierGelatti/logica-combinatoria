import {identifier} from "../core/expressions/expression_constructors.ts";
import {Identifier} from "../core/expressions/identifier.ts";

export function promptIdentifier(promptText: string, promptInitialValue: string = ""): Identifier | undefined {
    const newName = prompt(promptText, promptInitialValue)?.trim();
    if (newName === undefined) return;

    const parsedIdentifier = parseIdentifier(newName);
    if (parsedIdentifier === undefined) return promptIdentifier("Nombre inválido", newName);

    return parsedIdentifier;
}

export function promptIdentifiers(promptText: string, promptInitialValue: string = ""): Identifier[] | undefined {
    const userInput = prompt(promptText, promptInitialValue)?.trim();
    if (userInput === undefined) return;

    const newNames = userInput.split(",").map(part => part.trim());
    if (newNames.length === 0) return;
    const newIdentifiers = newNames.map(name => parseIdentifier(name));

    if (newIdentifiers.includes(undefined)) {
        return promptIdentifiers("Nombres inválidos", newNames.join(", "));
    }

    return newIdentifiers as Identifier[];
}

const identifierNameRegex = /^([^\s\d]\S*?)_?(\d*)$/;

function parseIdentifier(newName: string): Identifier | undefined {
    const matchResult = newName.match(identifierNameRegex);
    if (matchResult === null) return undefined;

    const name = matchResult[1];
    const subscript = matchResult[2] !== "" ? Number(matchResult[2]) : undefined;
    return identifier(name, subscript);
}
