export function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    properties: Partial<Omit<HTMLElementTagNameMap[K], "style"> & { style: Partial<CSSStyleDeclaration>, classNames?: string[] }> = {},
    children: (Node | string)[] = [],
) {
    const newElement = document.createElement(tagName);
    const { style, classNames, ...propertiesWithoutStyle } = properties;
    Object.assign(newElement, propertiesWithoutStyle);
    if (style) Object.assign(newElement.style, style);
    for (const className of classNames ?? []) {
        newElement.classList.add(className);
    }
    newElement.append(...children);
    return newElement;
}
