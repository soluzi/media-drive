describe("Simple Test", () => {
  it("should pass", () => {
    expect(1 + 1).toBe(2);
  });

  it("should test basic imports", () => {
    // Test that we can import from the media library
    const { initMediaLibrary } = require("../src/media/config");
    expect(typeof initMediaLibrary).toBe("function");
  });
});
