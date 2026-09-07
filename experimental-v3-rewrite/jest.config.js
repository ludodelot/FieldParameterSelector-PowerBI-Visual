module.exports = {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    roots: ["<rootDir>/test"],
    testMatch: ["**/*.test.ts"],
    globals: {
        "ts-jest": {
            tsconfig: "tsconfig.typecheck.json"
        }
    }
};
