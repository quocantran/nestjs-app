"use strict";

import { connectToRabbitMqForTest } from "../dbs/init.rabbit";

describe("RabbitMQ Connection", () => {
  it("should connect to RabbitMQ", async () => {
    const result = await connectToRabbitMqForTest();
    expect(result).toBeUndefined();
  });
});
