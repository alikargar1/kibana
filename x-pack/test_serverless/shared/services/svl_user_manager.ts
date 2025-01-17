/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerlessProjectType, SERVERLESS_ROLES_ROOT_PATH } from '@kbn/es';
import { SamlSessionManager } from '@kbn/test';
import { readRolesFromResource } from '@kbn/es';
import { resolve } from 'path';
import { Role } from '@kbn/test/src/auth/types';
import { isServerlessProjectType } from '@kbn/es/src/utils';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

export function SvlUserManagerProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const log = getService('log');
  const isCloud = !!process.env.TEST_CLOUD;
  const kbnServerArgs = config.get('kbnTestServer.serverArgs') as string[];
  const projectType = kbnServerArgs
    .filter((arg) => arg.startsWith('--serverless'))
    .reduce((acc, arg) => {
      const match = arg.match(/--serverless[=\s](\w+)/);
      return acc + (match ? match[1] : '');
    }, '') as ServerlessProjectType;

  if (!isServerlessProjectType(projectType)) {
    throw new Error(`Unsupported serverless projectType: ${projectType}`);
  }

  const supportedRoles = readRolesFromResource(
    resolve(SERVERLESS_ROLES_ROOT_PATH, projectType, 'roles.yml')
  );
  const defaultRolesToMap = new Map<string, Role>([
    ['es', 'developer'],
    ['security', 'editor'],
    ['oblt', 'editor'],
  ]);

  const getDefaultRole = () => {
    if (defaultRolesToMap.has(projectType)) {
      return defaultRolesToMap.get(projectType)!;
    } else {
      throw new Error(`Default role is not defined for ${projectType} project`);
    }
  };

  // Sharing the instance within FTR config run means cookies are persistent for each role between tests.
  const sessionManager = new SamlSessionManager({
    hostOptions: {
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: isCloud ? undefined : config.get('servers.kibana.port'),
      username: config.get('servers.kibana.username'),
      password: config.get('servers.kibana.password'),
    },
    log,
    isCloud,
    supportedRoles,
  });

  const DEFAULT_ROLE = getDefaultRole();

  return {
    async getSessionCookieForRole(role: string) {
      return sessionManager.getSessionCookieForRole(role);
    },
    async getApiCredentialsForRole(role: string) {
      return sessionManager.getApiCredentialsForRole(role);
    },
    async getUserData(role: string) {
      return sessionManager.getUserData(role);
    },
    DEFAULT_ROLE,
  };
}
