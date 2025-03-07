import { defineWorkspace } from 'vitest/config'

// noinspection JSUnusedGlobalSymbols
export default defineWorkspace([
    {
        test: {
            name: 'core',
            include: ['tests/core/**/*.test.ts'],
            environment: "node"
        },
    },
    {
        test: {
            name: 'dom',
            include: ['tests/dom/**/*.test.ts'],
            browser: {
                enabled: true,
                api: { host: '0.0.0.0', port: 63315 },
                provider: 'webdriverio',
                instances: [{
                    browser: 'chrome',
                    // @ts-ignore
                    capabilities: {
                        browserName: 'chrome',
                        'goog:chromeOptions': {
                            args: ['--remote-debugging-port=9229'],
                        },
                    },
                }],
            },
        },
    },
]);
