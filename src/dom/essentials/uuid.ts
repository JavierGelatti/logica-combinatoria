type UUID = `${string}-${string}-${string}-${string}-${string}`;

export function randomUUID(): UUID {
    if (!crypto.randomUUID) {
        return `${randomDigits(8)}-${randomDigits(4)}-${randomDigits(4)}-${randomDigits(4)}-${randomDigits(12)}`;

        function randomDigits(digits: number) {
            return Math.random().toString(16).substring(2, digits + 2);
        }
    }

    return crypto.randomUUID();
}

export function isUUID(text: string): text is UUID {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    return uuidRegex.test(text);
}