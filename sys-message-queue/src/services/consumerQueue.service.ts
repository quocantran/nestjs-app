import { connectRabbitMQ } from "../dbs/init.rabbit";
import { createDocument } from "./elasticsearch.service";
import dotenv from "dotenv";

dotenv.config();

export default class MessageService {
  static consumerToQueueSuccess = async () => {
    try {
      const result = await connectRabbitMQ();
      if (!result) {
        throw new Error("Failed to connect to RabbitMQ");
      }
      const { channel } = result;

      const notiQueue = "notiQueue";

      await channel.consume(notiQueue, (msg) => {
        try {
          const numberTest = Math.random();
          console.log("numberTest::", numberTest);

          if (numberTest < 0.9) {
            throw new Error("send noti failed::Hotfix");
          }
          console.log("Message success received: ", msg.content.toString());

          channel.ack(msg);
        } catch (err) {
          console.error("Error processing message:", err);
          // negative acknowledgment
          // sử dụng để xác nhận 1 message bị lỗi và không thể xử lý
          channel.nack(msg, false, false);
        }
      });
    } catch (err) {
      console.error("Error in consumerToQueueSuccess:", err);
      throw err;
    }
  };

  static consumerToQueueError = async () => {
    try {
      const result = await connectRabbitMQ();

      const { channel } = result;

      const notiDLX = process.env.EXCHANGE_DLX;
      const notiRoutingKey = process.env.ROUTING_KEY_DLX;

      const notiQueueHandler = process.env.NOTI_HOTFIX_QUEUE;

      await channel.assertExchange(notiDLX, "direct", { durable: true });

      const resultQueue = await channel.assertQueue(notiQueueHandler, {
        durable: true,
        exclusive: false,
      });

      await channel.bindQueue(resultQueue.queue, notiDLX, notiRoutingKey);

      await channel.consume(resultQueue.queue, async (msg) => {
        const maxRetry = 3;
        const content = JSON.parse(msg.content.toString());
        const queueName = content.data.queueName;
        console.log("content::", content);
        
        const retryCount = content.data.retryCount || 0;

        if (retryCount >= maxRetry) {
          // kill the message
          console.log("Message failed after 3 retries: ", msg.content.toString());
          
          // log error

          channel.ack(msg);
          return;
        }
        else{
          const newContent = {
            ...content,
            data : {
              ...content.data,
              retryCount: retryCount + 1
            }
          };
          setTimeout(() => {
            channel.sendToQueue(queueName, Buffer.from(JSON.stringify(newContent)), {
              expiration: 4000
            });
          }, 3000)
          channel.ack(msg);
        }
        
      });
    } catch (err) {
      console.error("Error in consumerToQueueError:", err);
      throw err;
    }
  };
}
