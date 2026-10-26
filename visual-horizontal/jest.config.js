module.exports = {
    testEnvironment: "jsdom",
    roots: ["<rootDir>/test"],
    testMatch: ["**/*.test.ts"],
    transform: {
        "^.+\.(ts|js)$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }]
    },
    // The formatting model utilities ship as ES modules.
    transformIgnorePatterns: ["node_modules/(?!powerbi-visuals-utils-formattingmodel)"],
    moduleNameMapper: { "\.less$": "<rootDir>/test/styleStub.js" },
    collectCoverageFrom: ["src/**/*.ts"],
    coverageReporters: ["text-summary"]
};
