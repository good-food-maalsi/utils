
import { RabbitMQ } from '../../src/mq/pubsub';
import * as amqp from 'amqplib';

// Mock amqplib
jest.mock('amqplib');

describe('RabbitMQ Pub/Sub', () => {
    let rabbitMQ: RabbitMQ;
    let mockConnection: any;
    let mockChannel: any;

    beforeEach(() => {
        rabbitMQ = new RabbitMQ('amqp://localhost');
        mockChannel = {
            assertQueue: jest.fn().mockResolvedValue({ queue: 'test-queue' }),
            sendToQueue: jest.fn(),
            consume: jest.fn(),
            ack: jest.fn(),
            close: jest.fn(),
        };
        mockConnection = {
            createChannel: jest.fn().mockResolvedValue(mockChannel),
            close: jest.fn(),
            on: jest.fn(), // for EventEmitter
        };
        (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should connect to RabbitMQ', async () => {
        await rabbitMQ.connect();
        expect(amqp.connect).toHaveBeenCalledWith('amqp://localhost');
        expect(mockConnection.createChannel).toHaveBeenCalled();
    });

    test('should publish message to queue', async () => {
        await rabbitMQ.connect();
        const queue = 'test-queue';
        const message = { data: 'test-data' };

        await rabbitMQ.publish(queue, message);

        expect(mockChannel.assertQueue).toHaveBeenCalledWith(queue, { durable: true });
        expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
            queue,
            Buffer.from(JSON.stringify(message))
        );
    });

    test('should subscribe to queue', async () => {
        await rabbitMQ.connect();
        const queue = 'test-queue';
        const handler = jest.fn();

        await rabbitMQ.subscribe(queue, handler);

        expect(mockChannel.assertQueue).toHaveBeenCalledWith(queue, { durable: true });
        expect(mockChannel.consume).toHaveBeenCalledWith(queue, expect.any(Function));

        // Simulate message consumption
        const consumeCallback = mockChannel.consume.mock.calls[0][1];
        const msg = {
            content: Buffer.from(JSON.stringify({ data: 'test-data' })),
        };

        await consumeCallback(msg);

        expect(handler).toHaveBeenCalledWith({ data: 'test-data' });
        expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });
});
