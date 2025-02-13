"use strict";
import { connectRabbitMQ } from "./dbs/init.rabbit";
import MessageService from "./services/consumerQueue.service";
import dotenv from "dotenv";
import express from "express";

const app = express();

dotenv.config();

connectRabbitMQ()
  .then((result) => {
    console.log("Connected to RabbitMQ");
  })
  .catch((err) => {
    throw err;
  });

MessageService.consumerToQueueError();

app.listen(3005, () => {
  console.log("Server is running on port 3005");
});
