
import * as amqp from 'amqplib';
import { Channel, ChannelModel, ConsumeMessage } from 'amqplib';

export class RabbitMQ {
    private connection: ChannelModel | null = null;
    private channel: Channel | null = null;
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    async connect(): Promise<void> {
        try {
            const connection = await amqp.connect(this.url);
            this.connection = connection;
            this.channel = await connection.createChannel();
            console.log('Connected to RabbitMQ');
        } catch (error) {
            console.error('Failed to connect to RabbitMQ', error);
            throw error;
        }
    }

    async publish(queue: string, message: any): Promise<void> {
        if (!this.channel) {
            throw new Error('Channel is not initialized');
        }

        await this.channel.assertQueue(queue, { durable: true });
        this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    }

    async subscribe(queue: string, handler: (msg: any) => Promise<void> | void): Promise<void> {
        if (!this.channel) {
            throw new Error('Channel is not initialized');
        }

        await this.channel.assertQueue(queue, { durable: true });
        this.channel.consume(queue, async (msg: ConsumeMessage | null) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    await handler(content);
                    this.channel?.ack(msg);
                } catch (error) {
                    console.error('Error processing message', error);
                    // Optionally nack or handle error appropriately
                }
            }
        });
    }

    async close(): Promise<void> {
        await this.channel?.close();
        await this.connection?.close();
    }
}
