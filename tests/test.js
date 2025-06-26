const request = require("supertest");
const app = require("../src/server"); // Điều chỉnh đường dẫn nếu cần

describe("API Test", () => {
  it("should return 200 OK for root endpoint", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
  });
});
