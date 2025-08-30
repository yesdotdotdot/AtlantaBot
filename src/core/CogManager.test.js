const { jest } = require("@jest/globals");
const CogManager = require("./CogManager");

// Mock Discord.js client
const mockClient = {
    on: jest.fn(),
    off: jest.fn(),
    logger: {
        log: jest.fn()
    }
};

// Mock GuildConfig model
const mockGuildConfig = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn()
};

jest.mock("./guildConfig.model", () => mockGuildConfig);

describe("CogManager", () => {
    let cogManager;
    
    beforeEach(() => {
        jest.clearAllMocks();
        cogManager = new CogManager(mockClient, { db: "mock-db" });
    });
    
    describe("constructor", () => {
        test("should initialize with default values", () => {
            expect(cogManager.client).toBe(mockClient);
            expect(cogManager.cogs).toBeInstanceOf(Map);
            expect(cogManager.commandMap).toBeInstanceOf(Map);
            expect(cogManager.db).toBe("mock-db");
        });
    });
    
    describe("load", () => {
        test("should load a valid cog successfully", async () => {
            const mockCog = {
                id: "test-cog",
                name: "Test Cog",
                description: "A test cog",
                commands: [
                    {
                        data: { name: "test" }
                    }
                ],
                events: [
                    {
                        name: "messageCreate",
                        handler: jest.fn()
                    }
                ]
            };
            
            // Mock require to return our test cog
            const originalRequire = require;
            require = jest.fn(() => mockCog);
            
            const result = await cogManager.load("/mock/path/test-cog");
            
            expect(result).toBe(true);
            expect(cogManager.cogs.has("test-cog")).toBe(true);
            expect(cogManager.commandMap.get("test")).toBe("test-cog");
            expect(mockClient.on).toHaveBeenCalledWith("messageCreate", expect.any(Function));
            
            // Restore require
            require = originalRequire;
        });
        
        test("should handle missing cog id gracefully", async () => {
            const mockCog = {
                name: "Test Cog",
                description: "A test cog"
            };
            
            const originalRequire = require;
            require = jest.fn(() => mockCog);
            
            const result = await cogManager.load("/mock/path/test-cog");
            
            expect(result).toBe(false);
            expect(cogManager.cogs.has("test-cog")).toBe(false);
            
            require = originalRequire;
        });
    });
    
    describe("unload", () => {
        test("should unload a cog successfully", async () => {
            // First load a cog
            const mockCog = {
                id: "test-cog",
                commands: [
                    { data: { name: "test" } }
                ],
                events: [
                    { name: "messageCreate", handler: jest.fn() }
                ]
            };
            
            const originalRequire = require;
            require = jest.fn(() => mockCog);
            
            await cogManager.load("/mock/path/test-cog");
            
            // Then unload it
            const result = await cogManager.unload("test-cog");
            
            expect(result).toBe(true);
            expect(cogManager.cogs.has("test-cog")).toBe(false);
            expect(cogManager.commandMap.has("test")).toBe(false);
            expect(mockClient.off).toHaveBeenCalled();
            
            require = originalRequire;
        });
        
        test("should handle unloading non-existent cog", async () => {
            const result = await cogManager.unload("non-existent");
            expect(result).toBe(false);
        });
    });
    
    describe("guild operations", () => {
        test("should enable cog for guild", async () => {
            mockGuildConfig.findOneAndUpdate.mockResolvedValue({
                guildId: "123",
                cogsEnabled: ["test-cog"]
            });
            
            const result = await cogManager.enableForGuild("test-cog", "123");
            
            expect(mockGuildConfig.findOneAndUpdate).toHaveBeenCalledWith(
                { guildId: "123" },
                { $addToSet: { cogsEnabled: "test-cog" } },
                { upsert: true, new: true }
            );
            expect(result.cogsEnabled).toContain("test-cog");
        });
        
        test("should disable cog for guild", async () => {
            mockGuildConfig.findOneAndUpdate.mockResolvedValue({
                guildId: "123",
                cogsEnabled: []
            });
            
            const result = await cogManager.disableForGuild("test-cog", "123");
            
            expect(mockGuildConfig.findOneAndUpdate).toHaveBeenCalledWith(
                { guildId: "123" },
                { $pull: { cogsEnabled: "test-cog" } },
                { upsert: true, new: true }
            );
            expect(result.cogsEnabled).not.toContain("test-cog");
        });
        
        test("should check if cog is enabled for guild", async () => {
            mockGuildConfig.findOne.mockResolvedValue({
                guildId: "123",
                cogsEnabled: ["test-cog", "other-cog"]
            });
            
            const result = await cogManager.isEnabledForGuild("test-cog", "123");
            expect(result).toBe(true);
            
            const result2 = await cogManager.isEnabledForGuild("missing-cog", "123");
            expect(result2).toBe(false);
        });
    });
    
    describe("utility methods", () => {
        test("should list all cogs", () => {
            cogManager.cogs.set("cog1", {});
            cogManager.cogs.set("cog2", {});
            
            const result = cogManager.listCogs();
            expect(result).toEqual(["cog1", "cog2"]);
        });
        
        test("should get cog by command", () => {
            cogManager.commandMap.set("test-command", "test-cog");
            cogManager.cogs.set("test-cog", { module: { name: "Test Cog" } });
            
            const result = cogManager.getCogByCommand("test-command");
            expect(result.module.name).toBe("Test Cog");
        });
        
        test("should return null for unknown command", () => {
            const result = cogManager.getCogByCommand("unknown-command");
            expect(result).toBeNull();
        });
    });
});
