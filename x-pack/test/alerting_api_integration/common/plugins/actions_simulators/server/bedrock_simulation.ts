/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';

import { EventStreamCodec } from '@smithy/eventstream-codec';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';
import { ProxyArgs, Simulator } from './simulator';

export class BedrockSimulator extends Simulator {
  private readonly returnError: boolean;

  constructor({ returnError = false, proxy }: { returnError?: boolean; proxy?: ProxyArgs }) {
    super(proxy);

    this.returnError = returnError;
  }

  public async handler(
    request: http.IncomingMessage,
    response: http.ServerResponse,
    data: Record<string, unknown>
  ) {
    if (this.returnError) {
      return BedrockSimulator.sendErrorResponse(response);
    }

    if (request.url === '/model/anthropic.claude-v2:1/invoke-with-response-stream') {
      return BedrockSimulator.sendStreamResponse(response);
    }

    return BedrockSimulator.sendResponse(response);
  }

  private static sendResponse(response: http.ServerResponse) {
    response.statusCode = 202;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(bedrockSuccessResponse, null, 4));
  }

  private static sendStreamResponse(response: http.ServerResponse) {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/octet-stream');
    response.setHeader('Transfer-Encoding', 'chunked');
    response.write(encodeBedrockResponse('Hello world, what a unique string!'));
    response.end();
  }

  private static sendErrorResponse(response: http.ServerResponse) {
    response.statusCode = 422;
    response.setHeader('Content-Type', 'application/json;charset=UTF-8');
    response.end(JSON.stringify(bedrockFailedResponse, null, 4));
  }
}

export const bedrockSuccessResponse = {
  stop_reason: 'max_tokens',
  completion: 'Hello there! How may I assist you today?',
};

export const bedrockFailedResponse = {
  message:
    'Malformed input request: extraneous key [ooooo] is not permitted, please reformat your input and try again.',
};

function encodeBedrockResponse(completion: string) {
  return new EventStreamCodec(toUtf8, fromUtf8).encode({
    headers: {
      ':event-type': { type: 'string', value: 'chunk' },
      ':content-type': { type: 'string', value: 'application/json' },
      ':message-type': { type: 'string', value: 'event' },
    },
    body: Uint8Array.from(
      Buffer.from(
        JSON.stringify({
          bytes: Buffer.from(JSON.stringify({ completion })).toString('base64'),
        })
      )
    ),
  });
}
